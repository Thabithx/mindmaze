import mongoose,{Schema} from 'mongoose';
const schema=new Schema({user:{type:Schema.Types.ObjectId,required:true,unique:true},tokenHash:String,phone:String,chatId:{type:String,unique:true,sparse:true},expiresAt:Date,requestedAt:Date,codeHash:String,attempts:{type:Number,default:0},lastContactUpdate:Number,codeSentAt:Date});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('TelegramVerification',schema);
