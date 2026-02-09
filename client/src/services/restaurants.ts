import api from './api';

export interface RestaurantFichajeSettings {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  fichajeRadiusMeters: number;
  requireGeolocation: boolean;
  publicFichajeToken: string | null;
}

export const restaurantService = {
  getMy(): Promise<RestaurantFichajeSettings> {
    return api.get('/restaurants/me').then((r) => r.data.data);
  },
  update(id: string, data: Partial<{
    latitude: number | null;
    longitude: number | null;
    fichajeRadiusMeters: number;
    requireGeolocation: boolean;
  }>): Promise<RestaurantFichajeSettings> {
    return api.put(`/restaurants/${id}`, data).then((r) => r.data.data);
  },
  generateFichajeToken(id: string): Promise<{ publicFichajeToken: string }> {
    return api.post(`/restaurants/${id}/generate-fichaje-token`).then((r) => r.data.data);
  },
};
