import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

/**
 * Preprocess image for better OCR results
 */
async function preprocessImage(imagePath: string): Promise<Buffer> {
  return await sharp(imagePath)
    .greyscale()
    .normalize()
    .sharpen()
    .toBuffer();
}

/**
 * Perform OCR on a receipt image
 */
export async function extractTextFromImage(imagePath: string): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Preprocess the image
    const processedImage = await preprocessImage(imagePath);

    // Run Tesseract OCR
    const result = await Tesseract.recognize(
      processedImage,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const processingTime = Date.now() - startTime;

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100,
      processingTime
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Clean up OCR text for better parsing
 */
export function cleanOCRText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Fix common OCR errors
    .replace(/[|l](?=\d)/g, '1')
    .replace(/O(?=\d)/g, '0')
    .replace(/[!]/g, '1')
    // Remove non-printable characters
    .replace(/[^\x20-\x7E\n]/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .trim();
}
