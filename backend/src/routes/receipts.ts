import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { extractTextFromImage, cleanOCRText } from '../services/ocr.js';
import { parseReceiptText } from '../services/gemini.js';
import db from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import type { ReceiptProcessingResult, ApiResponse } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// All receipt routes require authentication
router.use(authenticate);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, HEIC, and WebP are allowed.'));
    }
  }
});

/**
 * POST /api/receipts/upload - Process a receipt image
 */
router.post('/upload', upload.single('receipt'), async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  const filePath = req.file.path;

  try {
    // Step 1: OCR Processing
    console.log('Starting OCR processing...');
    const ocrResult = await extractTextFromImage(filePath);
    const cleanedText = cleanOCRText(ocrResult.text);

    console.log('OCR completed, confidence:', ocrResult.confidence);
    console.log('Cleaned text preview:', cleanedText.substring(0, 200));

    // Step 2: AI Parsing with Gemini
    console.log('Sending to Gemini for parsing...');
    const items = await parseReceiptText(cleanedText);

    console.log('Gemini returned', items.length, 'items');

    // Step 3: Save receipt record
    const receiptId = uuidv4();
    db.prepare(`
      INSERT INTO receipts (id, user_id, filename, raw_text, items_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(receiptId, req.userId, req.file.filename, cleanedText, items.length);

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    const processingTime = Date.now() - startTime;

    const result: ReceiptProcessingResult = {
      items,
      rawText: cleanedText,
      confidence: ocrResult.confidence,
      processingTime
    };

    res.json({ success: true, data: result } as ApiResponse<ReceiptProcessingResult>);
  } catch (error) {
    // Clean up on error
    fs.unlink(filePath, () => {});

    console.error('Receipt processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process receipt'
    });
  }
});

/**
 * GET /api/receipts/history - Get receipt processing history
 */
router.get('/history', (req: AuthRequest, res: Response) => {
  try {
    const history = db.prepare(`
      SELECT id, filename, items_count as itemsCount, processed_at as processedAt
      FROM receipts
      WHERE user_id = ?
      ORDER BY processed_at DESC
      LIMIT 50
    `).all(req.userId);

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching receipt history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

export default router;
