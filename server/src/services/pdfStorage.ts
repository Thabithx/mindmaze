import { deliverRemotePdf } from './pdfDelivery.js';
import { watermarkPdf, WatermarkDetails } from './pdfWatermark.js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Response } from 'express';
import cloudinary from '../config/cloudinary.js';

const directory = () => path.resolve(process.env.UPLOAD_DIR || 'uploads');

const isPdf = (buffer: Buffer) => buffer && buffer.length >= 5 && buffer.subarray(0, Math.min(buffer.length, 1024)).includes(Buffer.from('%PDF-'));

export async function savePdf(file: Express.Multer.File) {
  if (!isPdf(file.buffer)) throw new Error('Select a valid PDF file.');

  // Save directly to Cloudinary cloud storage
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.UPLOAD_STORAGE !== 'local'
  ) {
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: 'mind_maze_courses', public_id: `${randomUUID()}.pdf` },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    console.log(`[Cloudinary] PDF uploaded to cloud: ${result.secure_url}`);
    return { pdfProvider: 'raw', pdfPublicId: result.public_id, pdfUrl: result.secure_url, pdfFileName: file.originalname };
  }

  // Fallback only if local storage is explicitly forced
  const key = `${randomUUID()}.pdf`;
  await mkdir(directory(), { recursive: true });
  await writeFile(path.join(directory(), key), file.buffer, { flag: 'wx' });
  return { pdfProvider: 'local', pdfPublicId: key, pdfUrl: '', pdfFileName: file.originalname };
}


export async function saveImage(file: Express.Multer.File) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    throw new Error('Select a valid image file (PNG, JPG, JPEG, WEBP).');
  }

  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.UPLOAD_STORAGE !== 'local'
  ) {
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'mind_maze_courses', public_id: `cover_${randomUUID()}` },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    console.log(`[Cloudinary] Course cover image uploaded to cloud: ${result.secure_url}`);
    return { url: result.secure_url, publicId: result.public_id };
  }

  // Local fallback
  const ext = path.extname(file.originalname) || '.jpg';
  const key = `cover_${randomUUID()}${ext}`;
  await mkdir(directory(), { recursive: true });
  await writeFile(path.join(directory(), key), file.buffer, { flag: 'wx' });
  return { url: `/uploads/${key}`, publicId: key };
}

export async function removeImage(publicId?: string) {
  if (!publicId) return;
  try {
    if (publicId.startsWith('cover_') && !publicId.includes('/')) {
      await unlink(path.join(directory(), path.basename(publicId))).catch(() => {});
    } else {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
  } catch {}
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
      if (course.pdfUrl && (course.pdfUrl.startsWith('http://') || course.pdfUrl.startsWith('https://'))) {
        await deliverRemotePdf(course.pdfUrl, course.pdfFileName, res, watermark);
        return;
      }
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
