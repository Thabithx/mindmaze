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
    const verificationRoute=req.originalUrl.split('?')[0];
    const allowed=verificationRoute==='/api/auth/profile'&&req.method==='GET'||['/api/auth/email-verification/send','/api/auth/email-verification/confirm'].includes(verificationRoute)&&req.method==='POST';
    if(user.emailVerificationRequired&&!user.emailVerified&&!allowed){res.status(403).json({message:'Verify your email to activate your account.',code:'EMAIL_VERIFICATION_REQUIRED'});return;}
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
