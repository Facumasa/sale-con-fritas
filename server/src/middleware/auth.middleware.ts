import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

// Extender la interfaz Request de Express
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    restaurantId?: string;
    employeeId?: string;
  };
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as any;

    // Buscar empleado asociado al userId para incluir employeeId en req.user
    const employee = await prisma.employee.findFirst({
      where: { userId: decoded.userId },
      select: { id: true },
    });

    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
      ...(employee && { employeeId: employee.id }),
    };

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};