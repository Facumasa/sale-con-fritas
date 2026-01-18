import { Router } from 'express';
import authController from './auth.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', authController.login.bind(authController));

// POST /api/auth/register
router.post('/register', authController.register.bind(authController));

// POST /api/auth/refresh
router.post('/refresh', authController.refresh.bind(authController));

// GET /api/auth/me (requiere autenticación)
router.get('/me', authenticateToken, authController.me.bind(authController));

export default router;
