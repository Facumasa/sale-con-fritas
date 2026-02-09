import { Response } from 'express';
import restaurantService from './restaurant.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

class RestaurantController {
  private async getUserRestaurantId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { restaurant: true, ownedRestaurant: true },
    });
    if (!user) return null;
    return user.ownedRestaurant?.id ?? user.restaurantId ?? null;
  }

  /**
   * GET /restaurants/me - Restaurante del usuario (para configuración)
   */
  async getMyRestaurant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }
      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(404).json({ success: false, error: 'Sin restaurante asociado' });
        return;
      }
      const restaurant = await restaurantService.getById(restaurantId);
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'Restaurante no encontrado' });
        return;
      }
      res.json({ success: true, data: restaurant });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /restaurants/:id - Actualizar configuración (solo admin/owner)
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }
      const restaurantId = await this.getUserRestaurantId(userId);
      const { id } = req.params;
      if (!restaurantId || restaurantId !== id) {
        res.status(403).json({ success: false, error: 'Sin acceso a este restaurante' });
        return;
      }
      const body = req.body as {
        latitude?: number | null;
        longitude?: number | null;
        fichajeRadiusMeters?: number;
        requireGeolocation?: boolean;
      };
      const restaurant = await restaurantService.updateFichajeSettings(restaurantId, body);
      res.json({ success: true, data: restaurant });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /restaurants/:id/generate-fichaje-token (solo admin/owner)
   */
  async generateFichajeToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }
      const userRestaurantId = await this.getUserRestaurantId(userId);
      const { id: restaurantId } = req.params;
      if (!restaurantId || userRestaurantId !== restaurantId) {
        res.status(403).json({ success: false, error: 'Sin acceso a este restaurante' });
        return;
      }
      const token = await restaurantService.generatePublicFichajeToken(restaurantId);
      res.json({ success: true, data: { publicFichajeToken: token } });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al generar token',
      });
    }
  }
}

export default new RestaurantController();
