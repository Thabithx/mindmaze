import { deliverRemotePdf } from './pdfDelivery.js';
import { watermarkPdf, WatermarkDetails } from './pdfWatermark.js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Response } from 'express';
import cloudinary from '../config/cloudinary.js';

const directory = () => path.resolve(process.env.UPLOAD_DIR || 'uploads');

export async function savePdf(file: Express.Multer.File) {
  if (file.buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('Select a valid PDF file.');
  if (process.env.UPLOAD_STORAGE === 'local') {
    const key = `${randomUUID()}.pdf`;
    await mkdir(directory(), { recursive: true });
    await writeFile(path.join(directory(), key), file.buffer, { flag: 'wx' });
    return { pdfProvider: 'local', pdfPublicId: key, pdfUrl: '', pdfFileName: file.originalname };
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_CLOUD_NAME === 'local-disabled') throw new Error('PDF storage is not configured.');
  const result: any = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: 'raw', folder: 'mind_maze_courses', public_id: `${randomUUID()}.pdf` }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
  });
  return { pdfProvider: 'raw', pdfPublicId: result.public_id, pdfUrl: result.secure_url, pdfFileName: file.originalname };
}

export async function removePdf(course: any) {
  if (!course.pdfPublicId) return;
  if (course.pdfProvider === 'local') await unlink(path.join(directory(), path.basename(course.pdfPublicId))).catch(e => { if (e.code !== 'ENOENT') throw e; });
  else await cloudinary.uploader.destroy(course.pdfPublicId, { resource_type: course.pdfProvider || (course.pdfUrl?.includes('/image/') ? 'image' : 'raw') });
}

export async function downloadPdf(course: any, res: Response, watermark?: WatermarkDetails | null) {
  if (course.pdfProvider === 'local') {
    const localFilePath = path.join(directory(), path.basename(course.pdfPublicId));
    try {
      const rawBuffer = await readFile(localFilePath);
      const finalBuffer = await watermarkPdf(rawBuffer, watermark);

      res.attachment(course.pdfFileName || 'notes.pdf');
      res.type('application/pdf');
      res.setHeader('Content-Length', finalBuffer.length);
      res.send(finalBuffer);
      return;
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(404).json({ message: 'PDF file is missing. Please ask the administrator to upload it again.' });
      }
      return;
    }
  }

  if (!course.pdfUrl) {
    res.status(404).json({ message: 'This course has no PDF.' });
    return;
  }
  await deliverRemotePdf(course.pdfUrl, course.pdfFileName, res, watermark);
}
