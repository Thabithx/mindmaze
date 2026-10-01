import mongoose,{Schema} from 'mongoose';
export default mongoose.model('PaperAsset',new Schema({paper:{type:Schema.Types.ObjectId,ref:'PastPaper',required:true,index:true},kind:{type:String,enum:['marking','image'],required:true},provider:String,fileKey:String,remoteUrl:String,fileName:String,mime:String,size:Number},{timestamps:true}));
