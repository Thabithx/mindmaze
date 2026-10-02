import crypto from 'node:crypto';
export const telegramEnabled=()=>process.env.TELEGRAM_VERIFICATION_ENABLED==='true';
export const telegramConfigured=()=>!!process.env.TELEGRAM_BOT_TOKEN&&/^[A-Za-z0-9_]{5,32}$/.test(process.env.TELEGRAM_BOT_USERNAME||'')&&/^[A-Za-z0-9_-]{32,256}$/.test(process.env.TELEGRAM_WEBHOOK_SECRET||'');
export function normalizePhone(value:unknown){let p=String(value||'').replace(/[\s()-]/g,'');if(/^0[0-9]{9}$/.test(p))p='+94'+p.slice(1);else if(/^[1-9][0-9]{7,14}$/.test(p))p='+'+p;return /^\+[1-9][0-9]{7,14}$/.test(p)?p:'';}
export const userPhone=(u:any)=>normalizePhone(u.whatsappNumber||u.mobileNumber||u.phoneNumber||u.phone);
export const telegramState=(u:any)=>{
 const phone=userPhone(u);
 const telegramVerified=!!u.telegramVerifiedAt&&!!phone&&u.telegramVerifiedPhone===phone;
 const manuallyVerified=!!u.manualVerification?.approvedAt&&!!u.manualVerification?.approvedBy&&!!phone&&u.manualVerification.phone===phone;
 return {telegramVerified,manuallyVerified,accountVerified:telegramVerified||manuallyVerified,telegramVerificationRequired:telegramEnabled()&&!!u.telegramVerificationRequired,telegramVerifiedAt:u.telegramVerifiedAt||null};
};
export const digest=(value:string)=>crypto.createHmac('sha256',process.env.JWT_SECRET||'mind_maze_jwt_secret_key_2026_al_app').update(value).digest('hex');
export const validWebhook=(header:string)=>{const a=Buffer.from(header),b=Buffer.from(process.env.TELEGRAM_WEBHOOK_SECRET||'');return b.length>0&&a.length===b.length&&crypto.timingSafeEqual(a,b);};
