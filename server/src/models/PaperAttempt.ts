import mongoose,{Schema} from 'mongoose';
const schema=new Schema({
  tokenHash:{type:String,required:true,unique:true},
  paper:{type:Schema.Types.ObjectId,required:true,index:true},
  user:{type:Schema.Types.ObjectId,ref:'User'},
  title:{type:String,required:true},version:{type:String,default:''},
  questions:{type:[Schema.Types.Mixed],required:true},
  answers:{type:[[Number]],required:true},
  deadline:{type:Date,required:true},
  cleanupAt:{type:Date,required:true},
  revision:{type:Number,default:0},
  result:{type:Schema.Types.Mixed,default:undefined},
},{timestamps:true});
schema.index({cleanupAt:1},{expireAfterSeconds:0});
export default mongoose.model('PaperAttempt',schema);
