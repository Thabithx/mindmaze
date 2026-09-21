import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CheckCircle2, Loader2, Mail, ArrowLeft, ArrowRight } from 'lucide-react';

type ConfirmStatus = 'verifying' | 'confirmed' | 'needs-signin';

function goTo(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Target of the Supabase "Confirm signup" email link (set the template's
 * redirect to `{{ .SiteURL }}/confirmed`). Exchanges the verification code
 * (PKCE ?code=…), verifies ?token_hash=… links, or picks up implicit
 * #access_token links, then shows a clear success state instead of dropping
 * the student back on the sign-up form in a confusing new tab.
 */
export const EmailConfirmed: React.FC = () => {
  const [status, setStatus] = useState<ConfirmStatus>('verifying');
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus('needs-signin');
      return;
    }
    let cancelled = false;
    const finish = (ok: boolean) => {
      if (!cancelled) setStatus(ok ? 'confirmed' : 'needs-signin');
    };

    const settle = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash || '';
        // Surface Supabase error params (expired / used link) instead of
        // spinning forever.
        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
        const errorDesc =
          url.searchParams.get('error_description') ||
          hashParams.get('error_description') ||
          url.searchParams.get('error') ||
          hashParams.get('error');
        // 1) PKCE flow: ?code=… — exchange it for a session.
        if (url.searchParams.has('code')) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (error) throw error;
          } catch (err) {
            // Expired/used link — fall through to the session check below.
            if (err instanceof Error && err.message) setDetail(err.message);
            else if (errorDesc) setDetail(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
          }
          // Keep the URL clean once the code is consumed.
          try {
            window.history.replaceState({}, '', '/confirmed');
          } catch {}
        } else if (url.searchParams.has('token_hash')) {
          // 2) token_hash flow (?token_hash=…&type=signup|email_change):
          //    verify directly. Recovery hashes are left to the app's
          //    PASSWORD_RECOVERY handler (shows the new-password form).
          const tokenHash = url.searchParams.get('token_hash') || '';
          const type = (url.searchParams.get('type') || 'signup').toLowerCase();
          if (type === 'recovery') {
            try {
              const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
              if (error) throw error;
            } catch (err) {
              if (err instanceof Error && err.message) setDetail(err.message);
            }
            // App's onAuthStateChange will flip to update-password; keep the
            // URL clean but don't force a confirmed state here.
            try {
              window.history.replaceState({}, '', '/confirmed');
            } catch {}
          } else {
            try {
              const verifyType = type === 'email_change' ? 'email_change' : 'signup';
              const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: verifyType as 'signup',
              });
              if (error) throw error;
            } catch (err) {
              if (err instanceof Error && err.message) setDetail(err.message);
              else if (errorDesc) setDetail(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
            }
            try {
              window.history.replaceState({}, '', '/confirmed');
            } catch {}
          }
        } else if (errorDesc) {
          setDetail(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        }
        // 3) Implicit flow (#access_token=…): detectSessionInUrl picks it up
        //    automatically; getSession below then succeeds.
        const { data } = await supabase.auth.getSession();
        finish(!!data.session);
      } catch {
        finish(false);
      }
    };

    void settle();
    // The client may finish exchanging the session asynchronously — flip to
    // confirmed as soon as the SIGNED_IN event arrives. Recovery links flip
    // the app to the new-password form instead (handled by App).
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        finish(true);
      }
      if (event === 'PASSWORD_RECOVERY') {
        // Let App render the update-password screen; stop spinning here.
        finish(false);
      }
    });
    // Safety net: never spin forever on an expired/used link.
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        finish(!!data.session);
      } catch {
        finish(false);
      }
    }, 9000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0F1023] bg-[radial-gradient(circle_at_top_right,_#1a1b3d_0%,_#0F1023_100%)] text-slate-100 flex items-center justify-center px-4 py-10 font-['Poppins',sans-serif]">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={() => goTo('/')}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <img
            src="/icon-192.png"
            alt="Mind Maze logo"
            width={192}
            height={192}
            className="w-20 h-20 rounded-3xl object-cover ring-1 ring-white/10 shadow-[0_0_30px_rgba(107,78,255,0.4)] mx-auto"
            draggable={false}
          />
          <div>
            <h1 className="text-2xl font-black text-white">
              Mind <span className="bg-gradient-to-r from-[#6B4EFF] via-[#8B5CF6] to-[#00F5FF] bg-clip-text text-transparent">Maze</span>
            </h1>
            <p className="text-[10px] tracking-wider uppercase font-medium text-cyan-400 mt-0.5">
              GCE A/L Study Planner
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-[#12142B]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          {status === 'verifying' && (
            <div className="space-y-4 text-center py-4">
              <Loader2 className="w-12 h-12 text-cyan-400 mx-auto animate-spin" />
              <h2 className="text-lg font-black text-white">Confirming your email…</h2>
              <p className="text-xs text-slate-400">One moment while we verify your link.</p>
            </div>
          )}

          {status === 'confirmed' && (
            <div className="space-y-4 text-center py-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-black text-white">Email confirmed!</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your account is verified and ready — your stream and completed
                topics from sign-up are already applied. Let&apos;s start studying.
              </p>
              <button
                type="button"
                onClick={() => goTo('/dashboard')}
                className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(107,78,255,0.4)]"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-slate-500">
                Your original tab is signed in too — you can close either one.
              </p>
            </div>
          )}

          {status === 'needs-signin' && (
            <div className="space-y-4 text-center py-2">
              <Mail className="w-12 h-12 text-cyan-400 mx-auto" />
              <h2 className="text-lg font-black text-white">Almost there — sign in</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                This link looks expired, already used, or opened in a different
                browser. Your verification (if completed) is saved — just sign
                in with your email and password to enter your account.
              </p>
              {detail && (
                <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                  Details: {detail}
                </p>
              )}
              <button
                type="button"
                onClick={() => goTo('/login')}
                className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(107,78,255,0.4)]"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
