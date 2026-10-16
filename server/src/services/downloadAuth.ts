import { Request } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ensureUserIndexNumber } from './studentIndex.js';
import { WatermarkDetails } from './pdfWatermark.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mind_maze_jwt_secret_key_2026_al_app';

/**
 * Extracts student/user information from the download request to watermark the PDF.
 * Checks both Authorization header ('Bearer <token>') and query parameter ('?token=<token>').
 */
export async function extractDownloadWatermark(req: Request): Promise<WatermarkDetails | null> {
  // 0. If user was already attached by middleware
  if ((req as any).user) {
    const user = (req as any).user;
    if (!user.indexNumber && typeof user.save === 'function') {
      try {
        user.indexNumber = await ensureUserIndexNumber(user);
      } catch {}
    }
    return {
      name: user.name || 'MindMaze Student',
      indexNumber: user.indexNumber || 'MM-STUDENT',
      date: new Date().toISOString().split('T')[0],
    };
  }

  let token: string | undefined;

  // 1. Header authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Query param
  if (!token && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select('name indexNumber role isActive');
    if (!user || !user.isActive) return null;

    if (!user.indexNumber) {
      user.indexNumber = await ensureUserIndexNumber(user);
    }

    return {
      name: user.name,
      indexNumber: user.indexNumber,
      date: new Date().toISOString().split('T')[0],
    };
  } catch {
    return null;
  }
}
