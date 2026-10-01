import {Router} from 'express';
import {protect,AuthRequest} from '../middleware/authMiddleware.js';
import {issueVerification,confirmVerification} from '../services/emailVerification.js';
const router=Router();
router.post('/email-verification/send',protect,async(req:AuthRequest,res)=>{try{await issueVerification(req.user!);res.json({message:'Verification code sent. Check your inbox and spam folder.'});}catch(e:any){res.status(429).json({message:e.message});}});
router.post('/email-verification/confirm',protect,async(req:AuthRequest,res)=>{try{const user=await confirmVerification(req.user!,req.body.code);res.json({user,message:'Email verified.'});}catch(e:any){res.status(e.code===11000?409:400).json({message:e.code===11000?'That email is already in use. Choose a different address.':e.message});}});
export default router;
