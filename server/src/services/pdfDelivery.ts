import { Response } from 'express';
import { watermarkPdf, WatermarkDetails } from './pdfWatermark.js';

export async function deliverRemotePdf(
  url: string,
  fileName: string,
  res: Response,
  watermark?: WatermarkDetails | null
) {
  let remote: globalThis.Response;
  try {
    remote = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch {
    res.status(504).json({ message: 'The PDF provider did not respond. Please try again shortly.' });
    return;
  }
  if (!remote.ok || !remote.body) {
    const providerError = remote.headers.get('x-cld-error') || '';
    const blocked = remote.status === 401 || remote.status === 403 || /deny|acl|blocked|untrusted/i.test(providerError);
    console.warn('PDF delivery failed', { status: remote.status, blocked });
    await remote.body?.cancel();
    res.status(502).json({
      code: blocked ? 'PDF_DELIVERY_BLOCKED' : 'PDF_PROVIDER_ERROR',
      message: blocked
        ? 'PDF delivery is blocked by the file provider. Ask the administrator to check Cloudinary Settings → Security → Allow delivery of PDF and ZIP files, and this file’s access permissions.'
        : remote.status === 404
          ? 'The uploaded PDF is missing from file storage. Ask the administrator to upload it again.'
          : 'The file provider could not deliver this PDF. Ask the administrator to check its Cloudinary delivery settings or try again later.',
    });
    return;
  }

  try {
    const arrayBuffer = await remote.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // Apply student dynamic watermark
    const finalBuffer = await watermarkPdf(rawBuffer, watermark);

    res.attachment(fileName || 'document.pdf');
    res.type('application/pdf');
    res.setHeader('Content-Length', finalBuffer.length);
    res.send(finalBuffer);
  } catch (err: any) {
    console.error('Failed delivering watermarked remote PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to process and deliver PDF document.' });
    }
  }
}
