import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface WatermarkDetails {
  name: string;
  indexNumber: string;
  date?: string;
}

/**
 * Dynamically stamps the student's name, unique index number, and download timestamp
 * across all pages of a PDF document as an anti-piracy watermark and official attribution banner.
 */
export async function watermarkPdf(
  pdfBuffer: Buffer,
  info?: WatermarkDetails | null
): Promise<Buffer> {
  // If no specific student info is provided, use MindMaze platform defaults
  const studentName = (info?.name || 'MindMaze Student').trim();
  const indexNumber = (info?.indexNumber || 'VERIFIED-STUDENT').trim();
  const downloadDate = info?.date || new Date().toISOString().split('T')[0];

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    const watermarkText = `${studentName.toUpperCase()} • ${indexNumber}`;
    const headerFooterText = `MindMaze Official Material | Licensed to: ${studentName} | Index No: ${indexNumber} | Date: ${downloadDate}`;

    for (const page of pages) {
      const { width, height } = page.getSize();

      // 1. Diagonal repeating center watermarks
      const diagonalFontSize = Math.max(14, Math.min(26, Math.round(width / 22)));
      const textWidth = fontBold.widthOfTextAtSize(watermarkText, diagonalFontSize);

      // We place 3 diagonal watermark lines spread across the page height
      const yOffsets = [height * 0.72, height * 0.48, height * 0.24];
      for (const yPos of yOffsets) {
        page.drawText(watermarkText, {
          x: Math.max(20, (width - textWidth) / 2),
          y: yPos,
          size: diagonalFontSize,
          font: fontBold,
          color: rgb(0.5, 0.5, 0.55),
          opacity: 0.16,
          rotate: degrees(30),
        });
      }

      // 2. Top Banner
      const bannerFontSize = Math.max(7, Math.min(9, Math.round(width / 70)));
      const bannerWidth = fontRegular.widthOfTextAtSize(headerFooterText, bannerFontSize);
      const bannerX = Math.max(12, (width - bannerWidth) / 2);

      page.drawText(headerFooterText, {
        x: bannerX,
        y: height - 16,
        size: bannerFontSize,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.4),
        opacity: 0.7,
      });

      // 3. Bottom Banner
      page.drawText(headerFooterText, {
        x: bannerX,
        y: 12,
        size: bannerFontSize,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.4),
        opacity: 0.7,
      });
    }

    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
  } catch (error) {
    console.error('[Watermark Error] Could not watermark PDF, serving original:', error);
    return pdfBuffer;
  }
}
