import crypto from 'crypto';
import prisma from '../../config/database';

class RestaurantService {
  async generatePublicFichajeToken(restaurantId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { publicFichajeToken: token },
    });
    return token;
  }

  async getById(restaurantId: string) {
    return prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        fichajeRadiusMeters: true,
        requireGeolocation: true,
        publicFichajeToken: true,
      },
    });
  }

  async updateFichajeSettings(
    restaurantId: string,
    data: {
      latitude?: number | null;
      longitude?: number | null;
      fichajeRadiusMeters?: number;
      requireGeolocation?: boolean;
    }
  ) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    });
  }
}

export default new RestaurantService();
