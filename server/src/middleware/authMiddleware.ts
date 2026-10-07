import {telegramEnabled,telegramState} from '../services/telegramVerification.js';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'mind_maze_jwt_secret_key_2026_al_app';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
    if (!user) {
      res.status(401).json({ message: 'User no longer exists' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ message: 'Your account has been deactivated by an admin' });
      return;
    }
    const route=req.originalUrl.split('?')[0];
    const verificationRoute=['/api/telegram/status','/api/telegram/start','/api/telegram/confirm'].includes(route);
    if(telegramEnabled()&&user.telegramVerificationRequired&&!telegramState(user).accountVerified&&!verificationRoute&&!(route==='/api/auth/profile'&&req.method==='GET')){res.status(403).json({message:'Verify your phone with Telegram or contact support for manual verification.',code:'TELEGRAM_VERIFICATION_REQUIRED'});return;}
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token invalid or expired' });
    return;
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin role required' });
  }
};

// Content privileges never grant access to user administration.
export const contentManagerOnly = (req:AuthRequest,res:Response,next:NextFunction):void => {
 if(req.user && ['admin','content_manager'].includes(req.user.role)) next();
 else res.status(403).json({message:'Access denied: Content Manager or Admin role required'});
};

// Never blocks: if a valid login token is present, exposes the user id so anonymous-friendly routes
// (like timed papers) can attach the attempt to the logged-in student.
export const optionalAuth = (req: any, _res: any, next: any): void => {
  const header = req.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET) as { id?: string };
      if (decoded?.id) req.optionalUserId = decoded.id;
    } catch { /* anonymous */ }
  }
  next();
};
