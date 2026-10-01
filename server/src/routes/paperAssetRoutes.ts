import {Router} from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import path from 'node:path';
import PastPaper from '../models/PastPaper.js';
import PaperAsset from '../models/PaperAsset.js';
import {protect,adminOnly} from '../middleware/authMiddleware.js';
import {saveAsset,removeAsset,assetDirectory} from '../services/paperAssets.js';
import {deliverRemotePdf} from '../services/pdfDelivery.js';
const router=Router();
const receiver=(size:number,field:string)=>{const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:size,files:1}}).single(field);return (req:any,res:any,next:any)=>upload(req,res,(e:any)=>e?res.status(400).json({message:e.code==='LIMIT_FILE_SIZE'?'File exceeds the upload size limit.':e.message}):next());};
router.param('id',(_req,res,next,id)=>{if(!mongoose.isValidObjectId(id)){res.status(404).json({message:'Paper not found.'});return;}next();});
router.post('/:id/marking-scheme',protect,adminOnly,receiver(25*1024*1024,'pdfFile'),async(req,res)=>{
 let asset:any;
 try{if(!req.file||req.file.buffer.subarray(0,5).toString()!=='%PDF-'){res.status(400).json({message:'Choose a PDF marking scheme, maximum 25 MiB.'});return;}
 if(!await PastPaper.exists({_id:req.params.id})){res.status(404).json({message:'Paper not found.'});return;}
 asset=await saveAsset(req.params.id,'marking',req.file,'application/pdf','.pdf');
 const previous=await PastPaper.findOneAndUpdate({_id:req.params.id},{$set:{markingSchemeId:String(asset._id)}},{new:false});
 if(!previous){await removeAsset(asset);res.status(404).json({message:'Paper was deleted.'});return;}
 if(previous.markingSchemeId){const old=await PaperAsset.findById(previous.markingSchemeId);if(old)await removeAsset(old).catch(()=>{});}
 res.status(201).json({markingSchemePath:'/past-papers/'+req.params.id+'/marking-scheme'});
 }catch{if(asset)await removeAsset(asset).catch(()=>{});res.status(500).json({message:'Could not save marking scheme. The existing scheme has been kept.'});}
});
router.get('/:id/marking-scheme',async(req,res)=>{try{const paper=await PastPaper.findById(req.params.id);const asset=paper?.markingSchemeId?await PaperAsset.findById(paper.markingSchemeId):null;if(!asset){res.status(404).json({message:'No marking scheme has been uploaded.'});return;}if(asset.provider==='local'){res.download(path.join(assetDirectory(),path.basename(asset.fileKey!)),asset.fileName!,e=>{if(e&&!res.headersSent)res.status(404).json({message:'Marking scheme file is missing.'});});return;}await deliverRemotePdf(asset.remoteUrl!,asset.fileName!,res);}catch{if(!res.headersSent)res.status(500).json({message:'Could not download marking scheme.'});}});
router.post('/:id/question-images',protect,adminOnly,receiver(5*1024*1024,'imageFile'),async(req,res)=>{
 try{const paper=await PastPaper.findById(req.params.id);if(!paper||paper.type!=='MCQ'){res.status(400).json({message:'Choose an MCQ paper.'});return;}const b=req.file?.buffer;let mime='',ext='';
 if(b&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';ext='.png';}else if(b&&b[0]===255&&b[1]===216&&b[2]===255){mime='image/jpeg';ext='.jpg';}else if(b&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'){mime='image/webp';ext='.webp';}
 if(!mime||!req.file){res.status(400).json({message:'Choose a PNG, JPG or WebP image, maximum 5 MiB. SVG is not supported.'});return;}
 const asset=await saveAsset(req.params.id,'image',req.file,mime,ext);res.status(201).json({imageId:String(asset._id),imagePath:'/past-papers/'+req.params.id+'/question-images/'+asset._id});
 }catch{res.status(500).json({message:'Could not upload the question image.'});}
});
router.get('/:id/question-images/:assetId',async(req,res)=>{try{if(!mongoose.isValidObjectId(req.params.assetId)){res.sendStatus(404);return;}const asset=await PaperAsset.findOne({_id:req.params.assetId,paper:req.params.id,kind:'image'});if(!asset||!await PastPaper.exists({_id:req.params.id})){res.sendStatus(404);return;}res.setHeader('X-Content-Type-Options','nosniff');if(asset.provider==='local'){res.type(asset.mime!).sendFile(path.join(assetDirectory(),path.basename(asset.fileKey!)),e=>{if(e&&!res.headersSent)res.sendStatus(404);});return;}res.redirect(asset.remoteUrl!);}catch{if(!res.headersSent)res.sendStatus(500);}});
export default router;
