import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import cloudinary from '../config/cloudinary.js';
import PaperAsset from '../models/PaperAsset.js';
export const assetDirectory=()=>path.resolve(process.env.UPLOAD_DIR||'uploads');
export async function removeAsset(asset:any){if(asset.provider==='local')await unlink(path.join(assetDirectory(),path.basename(asset.fileKey))).catch((e:any)=>{if(e.code!=='ENOENT')throw e;});else await cloudinary.uploader.destroy(asset.fileKey,{resource_type:asset.kind==='image'?'image':'raw'});if(asset._id)await PaperAsset.deleteOne({_id:asset._id});}
export async function saveAsset(paper:string,kind:string,file:Express.Multer.File,mime:string,ext:string){
 let stored:any;
 if(process.env.UPLOAD_STORAGE==='local'){const fileKey=randomUUID()+ext;await mkdir(assetDirectory(),{recursive:true});await writeFile(path.join(assetDirectory(),fileKey),file.buffer,{flag:'wx'});stored={provider:'local',fileKey};}
 else{if(!process.env.CLOUDINARY_CLOUD_NAME||process.env.CLOUDINARY_CLOUD_NAME==='local-disabled')throw Error('File storage is not configured.');const result:any=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({resource_type:kind==='image'?'image':'raw',folder:'mind_maze_paper_assets',public_id:randomUUID()+(kind==='marking'?'.pdf':'')},(e,r)=>e?reject(e):resolve(r));stream.end(file.buffer);});stored={provider:'cloudinary',fileKey:result.public_id,remoteUrl:result.secure_url};}
 try{return await PaperAsset.create({paper,kind,...stored,mime,fileName:file.originalname,size:file.size});}catch(e){await removeAsset({...stored,kind}).catch(()=>{});throw e;}
}
