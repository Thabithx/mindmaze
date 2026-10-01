import crypto from 'crypto';
import Verification from '../models/EmailVerification.js';
import User,{IUser} from '../models/User.js';
import {sendVerificationEmail} from './emailService.js';
export const verificationFields=(user:IUser)=>({emailVerified:!!user.emailVerified,emailVerificationRequired:!!user.emailVerificationRequired,pendingEmail:user.pendingEmail||''});
const secret=process.env.JWT_SECRET||'mind_maze_jwt_secret_key_2026_al_app';
const hash=(id:string,email:string,code:string)=>crypto.createHmac('sha256',secret).update(id+'|'+email+'|'+code).digest('hex');
export async function issueVerification(user:IUser) {
 const id=String(user._id),email=user.pendingEmail||user.email,now=new Date();
 if(user.emailVerified&&!user.pendingEmail)throw new Error('This email is already verified.');
 await Verification.updateOne({user:user._id},{$setOnInsert:{user:user._id}},{upsert:true});
 await Verification.updateOne({user:user._id,$or:[{windowStart:{$lte:new Date(Date.now()-3600000)}},{windowStart:{$exists:false}}]},{$set:{windowStart:now,sendCount:0}});
 const code=String(crypto.randomInt(100000,1000000)),digest=hash(id,email,code);
 const record=await Verification.findOneAndUpdate({user:user._id,sendCount:{$lt:5},$or:[{sentAt:{$lte:new Date(Date.now()-60000)}},{sentAt:{$exists:false}}]},{$set:{email,digest,sentAt:now,expiresAt:new Date(Date.now()+600000),attempts:0},$inc:{sendCount:1}},{new:true});
 if(!record)throw new Error('Please wait 60 seconds between codes. You can request up to 5 codes per hour.');
 try{await sendVerificationEmail(email,code);}catch{await Verification.updateOne({_id:record._id,digest},{$unset:{digest:1}});throw new Error('Email could not be sent. Your account is saved. Please try resending in 60 seconds.');}
}
export async function confirmVerification(user:IUser,code:unknown) {
 if(typeof code!=='string'||!/^\d{6}$/.test(code))throw new Error('Enter the six-digit code from your email.');
 const email=user.pendingEmail||user.email,digest=hash(String(user._id),email,code);
 const attempt=await Verification.findOneAndUpdate({user:user._id,email,expiresAt:{$gt:new Date()},attempts:{$lt:5},digest:{$exists:true}},{$inc:{attempts:1}},{new:true});
 if(!attempt)throw new Error('Code expired or attempt limit reached. Request a new code.');
 if(attempt.digest!==digest)throw new Error('Incorrect code. Check your latest email and try again.');
 const used=await Verification.findOneAndUpdate({_id:attempt._id,digest,attempts:{$lte:5},expiresAt:{$gt:new Date()}},{$unset:{digest:1}},{new:true});
 if(!used)throw new Error('This code is no longer valid. Request a new code.');
 const changed=await User.findOneAndUpdate({_id:user._id,email:user.email,...(user.pendingEmail?{pendingEmail:user.pendingEmail}:{$or:[{pendingEmail:{$exists:false}},{pendingEmail:''}]})},{$set:{email,emailVerified:true,emailVerificationRequired:false},$unset:{pendingEmail:1}},{new:true}).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
 if(!changed)throw new Error('Your email changed while verifying. Request a new code.');
 return changed;
}
