// Run on the backend host with its environment variables; never commit the bot token.
const {TELEGRAM_BOT_TOKEN:token,TELEGRAM_BOT_USERNAME:username,TELEGRAM_WEBHOOK_SECRET:secret,RENDER_EXTERNAL_URL,TELEGRAM_WEBHOOK_BASE_URL}=process.env;
try {
 if(!token||!username||!secret||!/^[A-Za-z0-9_-]{32,256}$/.test(secret))throw Error('Set the Telegram token, username and a 32+ character webhook secret first.');
 const origin=new URL(TELEGRAM_WEBHOOK_BASE_URL||RENDER_EXTERNAL_URL||'');
 if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('A public HTTPS backend URL is required.');
 const url=new URL('/api/telegram/webhook',origin).href;
 async function call(method,body={}) {
  const response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok||!data.ok)throw Error('Telegram rejected '+method+'. Check bot settings and credentials.');return data.result;
 }
 const bot=await call('getMe');if(bot.username.toLowerCase()!==username.toLowerCase())throw Error('Bot username does not match the token.');
 await call('setWebhook',{url,secret_token:secret,allowed_updates:['message']});
 const webhook=await call('getWebhookInfo');if(webhook.url!==url)throw Error('Webhook URL was not saved.');
 console.log('Webhook registered for @'+bot.username+' at '+url+'. Enable verification and test with a new account.');
} catch(error) {console.error(error instanceof TypeError?'Could not reach Telegram. Check the network and backend URL.':error.message);process.exitCode=1;}
