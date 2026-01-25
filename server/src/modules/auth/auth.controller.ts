import { Request, Response } from 'express';
import authService from './auth.service';
import { LoginRequest, RegisterRequest } from './auth.types';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validar inputs
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos',
        });
        return;
      }

      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido',
        });
        return;
      }

      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      res.status(401).json({
        success: false,
        error: message,
      });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, restaurantName }: RegisterRequest = req.body;

      // Validar inputs
      if (!name || !email || !password || !restaurantName) {
        res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos: name, email, password, restaurantName',
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Formato de email inválido',
        });
        return;
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres',
        });
        return;
      }

      const result = await authService.register({
        name,
        email,
        password,
        restaurantName,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al registrar usuario';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token es requerido',
        });
        return;
      }

      const tokens = await authService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al refrescar tokens';
      res.status(401).json({
        success: false,
        error: message,
      });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          ownedRestaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
        return;
      }

      // Eliminar el campo password antes de devolver
      const { password, ...userWithoutPassword } = user;

      // Determinar el restaurante
      const restaurant = userWithoutPassword.ownedRestaurant || userWithoutPassword.restaurant;

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          restaurant,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener usuario';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}

export default new AuthController();
