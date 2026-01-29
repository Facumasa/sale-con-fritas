import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender la interfaz Request de Express
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    restaurantId?: string;
  };
}

export const authenticateToken = (
  req: Request,  // ← IMPORTANTE: Vuelve a Request (no AuthRequest)
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as any;
    
    // Cast explícito a AuthRequest
    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
    };
    
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};