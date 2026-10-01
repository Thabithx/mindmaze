# MindMaze Telegram verification setup

This uses a normal Telegram bot, not the paid Telegram Gateway SMS replacement. Students need Telegram registered to the same phone number as their MindMaze account. It verifies control of that Telegram phone number, not their legal identity or email.

## 1. Create your bot
1. Open Telegram and find the official @BotFather account (https://t.me/BotFather).
2. Send /newbot. Choose a display name such as MindMaze Verification.
3. Choose an available username ending in bot, such as MindMazeVerifyBot.
4. Save the token privately. Do not paste it into chat, GitHub, screenshots, frontend variables or source code.
5. Give your developer the bot username. Enter the token directly in your Render backend's environment settings, or share it through your usual secure secret-sharing method.

## 2. Configure the backend on Render
Your developer needs access to the existing Render backend. Add these environment variables:

| Variable | Value |
| --- | --- |
| TELEGRAM_VERIFICATION_ENABLED | false initially |
| TELEGRAM_BOT_TOKEN | The secret token from BotFather |
| TELEGRAM_BOT_USERNAME | Your actual bot username, without @ |
| TELEGRAM_WEBHOOK_SECRET | A new random secret, at least 32 characters, using letters/numbers/_/- |
| TELEGRAM_WEBHOOK_BASE_URL | https://mindmaze-30xp.onrender.com (confirm this is still your backend) |

Generate a webhook secret privately with Node: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Keep your existing JWT_SECRET stable. Never put the Telegram token in a VITE_ variable.

Deploy both the backend on Render and the frontend on Vercel from the updated code. A frontend deployment alone is insufficient.

## 3. Register the webhook
Run the following from the repository root in a secure environment where the variables above are available:

    node server/scripts/setup-telegram.mjs

If the command runs from the server directory, use `node scripts/setup-telegram.mjs` instead. A local developer terminal with these variables also works if the Render plan does not provide a shell. The script does not read .env files automatically. Do not put tokens directly into commands that are saved in terminal history.

The helper checks the bot username and registers the backend webhook. It does not activate verification. Use a dedicated bot: registering a webhook replaces that bot's previous webhook.

## 4. Enable and test
Change TELEGRAM_VERIFICATION_ENABLED to true and redeploy/restart the backend.

- Create a new test student with your real Telegram phone number.
- Create the verification link, open the bot, press Start, then Share my phone number.
- Return to MindMaze and enter the six-digit code the bot sent.
- Confirm the dashboard becomes accessible and the admin users table says Verified (Telegram).
- Check an existing account can still use the website without verification.

New accounts created after activation must verify. Existing accounts are optional, including accounts made while the feature was disabled. Existing administrators retain access. No old account is automatically marked verified. A verified phone/Telegram account cannot verify multiple MindMaze accounts. Changing a verified phone removes its verified status.

Links/codes expire after 10 minutes. New links are limited to one per 60 seconds. A code permits five attempts. Only sharing the user's own matching Telegram contact is accepted; typing a number into Telegram does not verify it.

For an urgent rollback, set TELEGRAM_VERIFICATION_ENABLED=false and restart the backend. Accounts remain accessible; stored verification information is retained.

## Troubleshooting
- 404 on /api/telegram routes: the updated backend is not deployed/running.
- Bot does not reply: confirm the backend is awake, webhook registered, feature enabled and webhook secrets match. Free hosting cold starts can delay replies.
- Setup incomplete: check all variables and exact bot username.
- Number mismatch: use the Telegram account's phone number; Sri Lankan 07xxxxxxxx is normalized to +947xxxxxxxx. Changing the MindMaze number requires the current password.
- Expired link/code: request a new link after the 60-second wait.

The code was tested locally using simulated Telegram updates. Real bot delivery still needs the setup and end-to-end test above. No live bot was created or configured automatically.

Official references: https://core.telegram.org/bots/features#botfather and https://core.telegram.org/bots/api#setwebhook
