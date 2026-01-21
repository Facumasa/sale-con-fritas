import { Response } from 'express';
import * as aiService from './ai.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

class AIController {
  /**
   * Obtener el restaurantId del usuario autenticado
   */
  private async getUserRestaurantId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        restaurant: true,
        ownedRestaurant: true,
      },
    });

    if (!user) {
      return null;
    }

    // Priorizar ownedRestaurant, luego restaurant
    return user.ownedRestaurant?.id ?? user.restaurantId ?? null;
  }

  /**
   * POST /ai/generate - Generar horario con IA
   */
  async generateSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
        });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Usuario no tiene acceso a ningún restaurante',
        });
        return;
      }

      const { constraints, freeTextConstraints, hourlySlots, week, year, currentSchedule } = req.body;

      // Validar campos requeridos
      if (!hourlySlots || !Array.isArray(hourlySlots) || hourlySlots.length === 0) {
        res.status(400).json({
          success: false,
          error: 'hourlySlots es requerido y debe ser un array no vacío',
        });
        return;
      }

      if (week === undefined || year === undefined) {
        res.status(400).json({
          success: false,
          error: 'week y year son requeridos',
        });
        return;
      }

      if (week < 1 || week > 53) {
        res.status(400).json({
          success: false,
          error: 'La semana debe ser un número entre 1 y 53',
        });
        return;
      }

      if (year < 2000 || year > 2100) {
        res.status(400).json({
          success: false,
          error: 'El año debe ser un número válido',
        });
        return;
      }

      // Validar formato de slots
      const slotRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      for (const slot of hourlySlots) {
        if (typeof slot !== 'string' || !slotRegex.test(slot)) {
          res.status(400).json({
            success: false,
            error: `Formato de slot inválido: ${slot}. Debe ser "HH:MM-HH:MM"`,
          });
          return;
        }
      }

      const result = await aiService.generateScheduleWithAI({
        restaurantId,
        constraints: constraints || [],
        freeTextConstraints: freeTextConstraints || undefined,
        hourlySlots,
        week: parseInt(week),
        year: parseInt(year),
        currentSchedule: currentSchedule || undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('AI Schedule generation error:', error);
      const message = error instanceof Error ? error.message : 'Error al generar horario con IA';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /ai/optimize - Optimizar horario existente
   */
  async optimizeSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
        });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Usuario no tiene acceso a ningún restaurante',
        });
        return;
      }

      const { week, year, goal } = req.body;

      if (week === undefined || year === undefined) {
        res.status(400).json({
          success: false,
          error: 'week y year son requeridos',
        });
        return;
      }

      if (!goal || typeof goal !== 'string') {
        res.status(400).json({
          success: false,
          error: 'goal es requerido y debe ser un string',
        });
        return;
      }

      const result = await aiService.optimizeExistingSchedule(
        restaurantId,
        parseInt(week),
        parseInt(year),
        goal
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('AI Schedule optimization error:', error);
      const message = error instanceof Error ? error.message : 'Error al optimizar horario';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /ai/chat - Chat conversacional con IA
   */
  async chatWithAI(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
        });
        return;
      }

      const { message, context } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'message es requerido y debe ser un string',
        });
        return;
      }

      const response = await aiService.chatAboutSchedule(message, context || {});

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('AI Chat error:', error);
      const message = error instanceof Error ? error.message : 'Error en el chat con IA';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /ai/explain-conflicts - Explicar conflictos en un horario
   */
  async explainConflicts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
        });
        return;
      }

      const { shifts } = req.body;

      if (!shifts || !Array.isArray(shifts)) {
        res.status(400).json({
          success: false,
          error: 'shifts es requerido y debe ser un array',
        });
        return;
      }

      const explanation = await aiService.explainScheduleConflicts(shifts);

      res.status(200).json({
        success: true,
        data: { explanation },
      });
    } catch (error) {
      console.error('AI Conflict explanation error:', error);
      const message = error instanceof Error ? error.message : 'Error al explicar conflictos';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}

export default new AIController();
