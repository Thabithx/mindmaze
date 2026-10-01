import mongoose,{Schema} from 'mongoose';
export default mongoose.model('PastPaper',new Schema({
  title:{type:String,required:true},subject:{type:String,required:true},stream:{type:String,required:true},streams:{type:[String],default:undefined},year:{type:Number,required:true,min:2000,max:2100},
  syllabus:{type:String,default:'current'},type:{type:String,default:'MCQ'},medium:{type:String,required:true},isModelPaper:{type:Boolean,default:false},
  topicTags:{type:[String],default:[]},fileName:{type:String,required:true},size:{type:Number,required:true},
  provider:{type:String,enum:['local','cloudinary'],required:true},fileKey:{type:String,required:true},remoteUrl:{type:String,default:''},
  markingSchemeId:{type:String,default:''},
  quizVersion:{type:String,default:''},
  quizQuestions:{type:[new Schema({text:{type:String,required:true},imageId:{type:String,default:''},imageAlt:{type:String,default:''},options:{type:[String],required:true},correctIndex:{type:Number,required:true},explanation:{type:String,default:''}},{_id:false})],default:[]},
  createdBy:{type:Schema.Types.ObjectId,ref:'User',required:true},
},{timestamps:true}));
