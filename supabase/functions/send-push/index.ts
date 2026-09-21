// Mind Maze — free Web Push sender (Supabase Edge Function, Deno).
// Deploy: supabase functions deploy send-push
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
// Schedule: pg_cron every 15 min -> SELECT net.http_post(...) to this function URL
//   with service-role key. Manual test: POST {"dryRun": true} (sends NOTHING,
//   reports pipeline state) or POST {"testUserId": "<uuid>"} (one real push).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@mindmaze.app";

// Lazy VAPID setup: configuring at module top with `!` crashed EVERY
// invocation (500) when the secrets were never set — including the dryRun
// diagnostic that exists precisely to detect that state. Instead, sends
// refuse cleanly per-call and dryRun can still report `vapidConfigured`.
let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
    return true;
  } catch {
    return false;
  }
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// --- WhatsApp daily quiz reminder (separate notification type) ---
// Twice daily in Sri Lanka time (UTC+5:30): noon + 5pm. Cron ticks every
// 15 min, so each window below is 15 min wide and deduped per day.
const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8OnJGCRs1fpYosgU1z";
const WHATSAPP_QUIZ_ICON = "https://mind-maze-mu.vercel.app/bell.png";
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Minutes since midnight for "HH:MM", or null when malformed. A single bad
 *  row must NEVER throw: an uncaught throw here 500s the whole cron run and
 *  zero pushes go out to ANYONE. Callers skip null rows. */
function toMinutes(t: unknown): number | null {
  if (typeof t !== "string" || !/^\d{1,2}:\d{2}/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Decode the Bearer JWT payload WITHOUT verifying (the edge runtime already
 *  verified the signature when JWT verification is enabled). Used only to
 *  find the caller for the admin gate below. */
function getJwtClaims(req: Request): Record<string, unknown> | null {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when the caller may use the diagnostic endpoints (dryRun / testUserId):
 *  the service_role key (cron + owner curl) or a signed-in admin user.
 *  Regular students get 403 — otherwise anyone could trigger pushes to anyone. */
async function callerIsAdmin(supabase: any, req: Request): Promise<boolean> {
  const claims = getJwtClaims(req);
  if (!claims) return false;
  if (claims.role === "service_role") return true;
  const sub = typeof claims.sub === "string" ? claims.sub : null;
  if (!sub) return false;
  try {
    const { data } = await supabase.from("profiles").select("role").eq("id", sub).maybeSingle();
    return (data as { role?: unknown } | null)?.role === "admin";
  } catch {
    return false;
  }
}

async function alreadySent(supabase: any, userId: string, dedupeKey: string): Promise<boolean> {
  const { data } = await supabase
    .from("push_sent_log")
    .select("dedupe_key")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();
  return !!data;
}

async function markSent(supabase: any, userId: string, kind: string, dedupeKey: string) {
  await supabase.from("push_sent_log").upsert(
    { user_id: userId, kind, dedupe_key: dedupeKey },
    { onConflict: "user_id,dedupe_key" },
  );
}

async function sendToUser(supabase: any, userId: string, payload: object) {
  // No VAPID secrets -> nothing can be delivered; refuse loudly per call
  // instead of throwing (the dryRun diagnostic reports vapidConfigured).
  if (!ensureVapid()) {
    console.warn("push send skipped: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY secrets are not set");
    return 0;
  }
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs?.length) return 0;
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      ok++;
    } catch (e: any) {
      // 404/410 = subscription expired or revoked: clean it so future sends stay fast.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", s.endpoint);
      } else {
        console.warn("push send failed", e?.statusCode ?? e?.message);
      }
    }
  }
  return ok;
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  // All students are in Sri Lanka (UTC+5:30) but this function runs on
  // Supabase servers in UTC. Anchor EVERY time comparison below to Sri
  // Lanka wall-clock time: shift UTC -> SL, then read the result back with
  // the UTC getters (getUTCHours/getUTCDay) so the deploy region's local
  // timezone can never shift the logic.
  const slNow = new Date(now.getTime() + SL_OFFSET_MS);
  const slHour = slNow.getUTCHours();
  const slTodayStr = slNow.toISOString().slice(0, 10); // YYYY-MM-DD in SL time
  const slDayName = DAY_NAMES[slNow.getUTCDay()];
  const slNowMin = slNow.getUTCHours() * 60 + slNow.getUTCMinutes();
  // Legacy aliases kept so the rest of the handler reads naturally.
  const todayStr = slTodayStr;
  const dayName = slDayName;
  const nowMin = slNowMin;

  let body: any = {};
  try {
    body = await req.json();
  } catch { /* GET / cron without body */ }

  // --- Diagnostic: POST {"dryRun": true} sends NOTHING — it reports whether
  // the pipeline is alive, whether VAPID secrets exist, and whether there is
  // anyone to send to. Admin-only (plus the service_role cron/owner key):
  // row counts are not for regular students.
  if (body?.dryRun === true) {
    if (!(await callerIsAdmin(supabase, req))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const { count: subCount } = await supabase
      .from("push_subscriptions")
      .select("user_id", { count: "exact", head: true });
    const { count: slotCount } = await supabase
      .from("timetable_entries")
      .select("id", { count: "exact", head: true })
      .eq("day_of_week", dayName)
      .eq("reminder_enabled", true);
    return Response.json({
      ok: true,
      dryRun: true,
      slTime: `${slTodayStr} ${slDayName} ${slHour}:${String(slNow.getUTCMinutes()).padStart(2, "0")}`,
      vapidConfigured: !!(VAPID_PUBLIC && VAPID_PRIVATE),
      subscriptionRows: subCount ?? 0,
      enabledSlotsToday: slotCount ?? 0,
      // Daily quiz reminders (12:00 + 17:00 SL): the cron tick that falls in
      // either 15-min window fans out to every subscribed student.
      quizSlotNow: (slNowMin >= 12 * 60 && slNowMin < 12 * 60 + 15)
        ? "noon"
        : (slNowMin >= 17 * 60 && slNowMin < 17 * 60 + 15)
          ? "evening"
          : null,
      quizWindows: ["12:00", "17:00"],
    });
  }

  // --- Manual test: POST {"testUserId":"<uuid>"} sends one push immediately.
  // Admin-only: without this gate any signed-in user could trigger pushes to
  // any other user. The Admin Panel "Send test push" button calls this.
  if (body?.testUserId) {
    if (!(await callerIsAdmin(supabase, req))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const targetId = String(body.testUserId);
    if (!/^[0-9a-f-]{36}$/i.test(targetId)) {
      return Response.json({ ok: false, error: "bad user id" }, { status: 400 });
    }
    const n = await sendToUser(supabase, targetId, {
      title: "🔔 Mind Maze test push",
      body: "Closed-app push works! This arrived without any open tab.",
      tag: "mind-maze-test",
      url: "/",
    });
    return Response.json({ ok: true, sentToSubscriptions: n });
  }

  // Quiet hours: never push 22:00–08:00 Sri Lanka time (matches in-app rules).
  // NOTE: was `now.getHours()` (server UTC) — now uses SL wall-clock hour.
  if (slHour < 8 || slHour >= 22) {
    return Response.json({ ok: true, skipped: "quiet-hours" });
  }

  let sent = 0;

  // --- 1. Timetable pre-alerts due in the last 15-min window ---
  // start_time values are Sri Lanka wall-clock times (e.g. "06:00" = 6am SL),
  // so dayName/nowMin/todayStr above MUST be the SL-anchored values.
  // Each section is isolated: one bad row / failed query must never abort the
  // other notification types (a single throw used to 500 the run → nobody got
  // ANY push that tick).
  try {
    const { data: slots } = await supabase
      .from("timetable_entries")
      .select("user_id, id, subject, topic, start_time, reminder_offset_minutes")
      .eq("day_of_week", dayName)
      .eq("reminder_enabled", true);

    for (const s of slots ?? []) {
      try {
        const startMin = toMinutes((s as any).start_time);
        if (startMin === null) continue; // malformed row: skip, don't crash
        const offset = typeof (s as any).reminder_offset_minutes === "number"
          ? (s as any).reminder_offset_minutes
          : 15;
        const target = startMin - offset;
        const minsAgo = nowMin - target;
        if (minsAgo < 0 || minsAgo > 15) continue; // due within this cron tick
        const dedupe = `tt:${(s as any).id}:${todayStr}:${target}`;
        if (await alreadySent(supabase, (s as any).user_id, dedupe)) continue;
        const n = await sendToUser(supabase, (s as any).user_id, {
          title: `📚 ${(s as any).subject} in ${offset} min`,
          body: `${(s as any).topic} (${(s as any).start_time}) — gather your past papers!`,
          tag: dedupe,
          url: "/",
        });
        if (n > 0) {
          await markSent(supabase, (s as any).user_id, "timetable", dedupe);
          sent += n;
        }
      } catch (e) {
        console.warn("timetable slot send failed, continuing:", (e as Error)?.message ?? e);
      }
    }
  } catch (e) {
    console.warn("timetable section failed, continuing:", (e as Error)?.message ?? e);
  }

  // --- 2. Daily streak-nudge: one per day for users with incomplete tasks ---
  // (Keeps it cheap: one cron pass, one push per user per day max.)
  // daily_tasks.date is a client-local (SL) calendar date, so match it
  // against the SL-anchored todayStr, not server UTC date.
  try {
    const { data: tasks } = await supabase
      .from("daily_tasks")
      .select("user_id")
      .eq("date", todayStr)
      .eq("is_completed", false);
    const usersWithIncomplete = [...new Set((tasks ?? []).map((t: any) => t.user_id))];
    for (const userId of usersWithIncomplete) {
      try {
        const dedupe = `nudge:${todayStr}`;
        if (await alreadySent(supabase, userId, dedupe)) continue;
        const n = await sendToUser(supabase, userId, {
          title: "🔥 Protect your streak",
          body: "You still have unfinished topics today. A short session keeps the streak alive!",
          tag: dedupe,
          url: "/",
        });
        if (n > 0) {
          await markSent(supabase, userId, "nudge", dedupe);
          sent += n;
        }
      } catch (e) {
        console.warn("nudge send failed, continuing:", (e as Error)?.message ?? e);
      }
    }
  } catch (e) {
    console.warn("nudge section failed, continuing:", (e as Error)?.message ?? e);
  }

  // --- 3. WhatsApp daily quiz reminder: 12:00 & 17:00 Sri Lanka time ---
  // Applies to ALL subscribed students (not tied to timetable/streak).
  // Reuses the SL-anchored slNowMin/slTodayStr computed at the top of the
  // handler so all three notification types share one SL clock.
  // 12:00 SL = 06:30 UTC, 17:00 SL = 11:30 UTC.
  let quizSlot: "noon" | "evening" | null = null;
  if (slNowMin >= 12 * 60 && slNowMin < 12 * 60 + 15) quizSlot = "noon";
  else if (slNowMin >= 17 * 60 && slNowMin < 17 * 60 + 15) quizSlot = "evening";

  if (quizSlot) {
    const dedupe = `whatsapp-quiz-${quizSlot}-${slTodayStr}`;
    const payload = quizSlot === "noon"
      ? {
        title: "📢 Today's quiz is up!",
        body: "Check the WhatsApp channel now — today's quiz is waiting for you!",
        tag: dedupe,
        url: WHATSAPP_CHANNEL_URL,
        icon: WHATSAPP_QUIZ_ICON,
      }
      : {
        title: "📢 Evening quiz reminder!",
        body: "Haven't tried today's quiz yet? Tap to open the WhatsApp channel!",
        tag: dedupe,
        url: WHATSAPP_CHANNEL_URL,
        icon: WHATSAPP_QUIZ_ICON,
      };
    try {
      const { data: allSubs } = await supabase.from("push_subscriptions").select("user_id");
      const allUserIds = [...new Set((allSubs ?? []).map((s: any) => s.user_id))];
      for (const userId of allUserIds) {
        try {
          if (await alreadySent(supabase, userId, dedupe)) continue;
          const n = await sendToUser(supabase, userId, payload);
          if (n > 0) {
            await markSent(supabase, userId, "whatsapp_quiz", dedupe);
            sent += n;
          }
        } catch (e) {
          console.warn("quiz send failed, continuing:", (e as Error)?.message ?? e);
        }
      }
    } catch (e) {
      console.warn("quiz section failed, continuing:", (e as Error)?.message ?? e);
    }
  }

  return Response.json({ ok: true, sent });
});
