export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  restaurantName: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    restaurantId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  restaurantId: string | null;
}
