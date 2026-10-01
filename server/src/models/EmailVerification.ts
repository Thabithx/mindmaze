import mongoose,{Schema} from 'mongoose';
export default mongoose.model('EmailVerification',new Schema({
 user:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true},
 email:String,digest:String,expiresAt:Date,sentAt:Date,windowStart:Date,sendCount:{type:Number,default:0},attempts:{type:Number,default:0}
},{timestamps:true}));
