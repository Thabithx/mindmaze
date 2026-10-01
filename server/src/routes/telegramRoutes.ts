import {Router} from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/TelegramVerification.js';
import {protect,AuthRequest} from '../middleware/authMiddleware.js';
import {telegramEnabled,telegramConfigured,normalizePhone,userPhone,telegramState,digest,validWebhook} from '../services/telegramVerification.js';
const router=Router();
router.get('/status',protect,(req:AuthRequest,res)=>{res.json({enabled:telegramEnabled(),configured:telegramConfigured(),...telegramState(req.user!),phone:userPhone(req.user!)});});
router.post('/start',protect,async(req:AuthRequest,res)=>{try{
 if(!telegramEnabled()||!telegramConfigured()){res.status(503).json({message:'Telegram verification is not available yet. Contact the MindMaze team.'});return;}
 const user=await User.findById(req.user!._id);if(!user){res.sendStatus(401);return;}
 const phone=normalizePhone(req.body.phone||userPhone(user));if(!phone){res.status(400).json({message:'Enter your Telegram phone number, including country code (for example +94741135855).'});return;}
 if(telegramState(user).telegramVerified&&phone===userPhone(user)){res.status(400).json({message:'This phone number is already verified.'});return;}
 const owned=await User.exists({_id:{$ne:user._id},telegramVerifiedPhone:phone});if(owned){res.status(409).json({message:'This phone is already verified on another account.'});return;}
 if(phone!==userPhone(user)){if(typeof req.body.currentPassword!=='string'||!await bcrypt.compare(req.body.currentPassword,user.passwordHash)){res.status(400).json({message:'Enter your current password to change the phone number.'});return;}
 user.mobileNumber=phone;user.whatsappNumber=phone;user.phoneNumber=phone;user.phone=phone;user.telegramVerifiedAt=undefined;user.telegramVerifiedPhone=undefined;user.telegramUserId=undefined;await user.save();}
 await Session.updateOne({user:user._id},{$setOnInsert:{user:user._id}},{upsert:true});
 const token=crypto.randomBytes(24).toString('hex');
 const session=await Session.findOneAndUpdate({user:user._id,$or:[{requestedAt:{$exists:false}},{requestedAt:{$lte:new Date(Date.now()-60000)}}]},{$set:{tokenHash:digest(token),phone,expiresAt:new Date(Date.now()+600000),requestedAt:new Date(),attempts:0},$unset:{chatId:1,codeHash:1,lastContactUpdate:1,codeSentAt:1}},{new:true});
 if(!session){res.status(429).json({message:'Wait 60 seconds before requesting another verification link.'});return;}
 res.json({url:'https://t.me/'+process.env.TELEGRAM_BOT_USERNAME+'?start='+token,phone,message:'Open Telegram, share your own phone number and enter the code here. This link expires in 10 minutes.'});
 }catch{res.status(500).json({message:'Could not start verification. Please retry.'});}});
router.post('/confirm',protect,async(req:AuthRequest,res)=>{try{
 if(!telegramEnabled()){res.status(503).json({message:'Verification is currently disabled.'});return;}
 if(typeof req.body.code!=='string'||!/^\d{6}$/.test(req.body.code)){res.status(400).json({message:'Enter the six-digit Telegram code.'});return;}
 const session=await Session.findOneAndUpdate({user:req.user!._id,expiresAt:{$gt:new Date()},codeHash:{$exists:true},attempts:{$lt:5}},{$inc:{attempts:1}},{new:true});
 if(!session||session.codeHash!==digest(String(req.user!._id)+'|'+req.body.code)){res.status(400).json({message:'Incorrect or expired code. After 5 attempts, request a new link.'});return;}
 if(session.phone!==userPhone(req.user!)){res.status(409).json({message:'Your phone changed. Start verification again.'});return;}
 const consumed=await Session.findOneAndUpdate({_id:session._id,codeHash:session.codeHash,attempts:{$lte:5},expiresAt:{$gt:new Date()}},{$unset:{codeHash:1,tokenHash:1}},{new:true});if(!consumed){res.status(400).json({message:'Code already used. Request a new link.'});return;}
 const user=await User.findOneAndUpdate({_id:req.user!._id,whatsappNumber:req.user!.whatsappNumber,mobileNumber:req.user!.mobileNumber,isActive:true},{$set:{telegramVerifiedPhone:session.phone,telegramUserId:session.chatId,telegramVerifiedAt:new Date()}},{new:true}).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
 if(!user){res.status(409).json({message:'Account changed. Start verification again.'});return;}
 res.json({user:{...user.toObject(),...telegramState(user)},message:'Your Telegram phone number is verified.'});
 }catch(e:any){res.status(e.code===11000?409:500).json({message:e.code===11000?'This Telegram account or phone is already verified on another account.':'Could not complete verification. Start again.'});}});
router.post('/webhook',async(req,res)=>{
 if(!telegramEnabled()||!telegramConfigured()||!validWebhook(String(req.headers['x-telegram-bot-api-secret-token']||''))){res.sendStatus(403);return;}
 const m=req.body?.message,update=req.body?.update_id;
 if(!m||m.chat?.type!=='private'||!Number.isSafeInteger(m.from?.id)||m.from.is_bot||m.chat.id!==m.from.id||!Number.isSafeInteger(update)){res.json({ok:true});return;}
 const chatId=String(m.from.id);const reply=(text:string,reply_markup:any={remove_keyboard:true})=>res.json({method:'sendMessage',chat_id:chatId,text,reply_markup});
 try{
 const start=typeof m.text==='string'?m.text.match(/^\/start(?:@[A-Za-z0-9_]+)? ([a-f0-9]{48})$/):null;
 if(start){const session=await Session.findOne({tokenHash:digest(start[1]),expiresAt:{$gt:new Date()}});if(!session)return reply('This link expired. Return to MindMaze and request a new link.');if(session.chatId&&session.chatId!==chatId)return reply('This link is already being used. Request a new link in MindMaze.');
 await Session.updateMany({chatId,user:{$ne:session.user}},{$unset:{chatId:1,codeHash:1}});
 const bound=await Session.findOneAndUpdate({_id:session._id,tokenHash:session.tokenHash,$or:[{chatId:{$exists:false}},{chatId}]},{$set:{chatId}},{new:true});if(!bound)return reply('Request a new link from MindMaze.');
 return reply('MindMaze phone verification. Only continue if you requested this. Tap Share my phone number below; it must match the number on your MindMaze account.',{keyboard:[[{text:'Share my phone number',request_contact:true}]],resize_keyboard:true,one_time_keyboard:true});}
 if(m.contact){if(m.contact.user_id!==m.from.id)return reply('Share your own phone using the button. Forwarded or other contacts are not accepted.');
 const phone=normalizePhone(m.contact.phone_number);const session=await Session.findOne({chatId,phone,expiresAt:{$gt:new Date()},tokenHash:{$exists:true}});if(!session)return reply('The shared phone does not match, or the link expired. Check your phone in MindMaze and start again.');
 const code=String(crypto.randomInt(100000,1000000));const saved=await Session.findOneAndUpdate({_id:session._id,tokenHash:session.tokenHash,$and:[{$or:[{lastContactUpdate:{$exists:false}},{lastContactUpdate:{$lt:update}}]},{$or:[{codeSentAt:{$exists:false}},{codeSentAt:{$lte:new Date(Date.now()-60000)}}]}]},{$set:{codeHash:digest(String(session.user)+'|'+code),codeSentAt:new Date(),lastContactUpdate:update,attempts:0}},{new:true});
 if(!saved){res.json({ok:true});return;}return reply('Your MindMaze verification code is '+code+'. Enter it only on your MindMaze account. Do not share it. It expires with your 10-minute verification link.');}
 return reply('Start verification from the MindMaze website to get a secure link.');
 }catch{res.status(503).json({message:'Please retry later.'});}
});
export default router;
