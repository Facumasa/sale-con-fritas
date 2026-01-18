import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenPayload,
} from './auth.types';

class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets not configured in environment variables');
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        restaurant: true,
        ownedRestaurant: true,
      },
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Determinar el restaurante (puede ser ownedRestaurant o restaurant)
    const restaurant = user.ownedRestaurant || user.restaurant;

    // Generar tokens
    const tokens = this.generateTokens(user);

    // Retornar respuesta sin password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
      restaurant: restaurant
        ? {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            phone: restaurant.phone,
            email: restaurant.email,
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt,
          }
        : null,
    };
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { name, email, password, restaurantName } = data;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario, restaurante, suscripción y toolAccess en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear usuario owner
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'OWNER',
        },
      });

      // 2. Crear restaurante
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          ownerId: user.id,
        },
      });

      // 3. Actualizar usuario con restaurantId
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { restaurantId: restaurant.id },
      });

      // 4. Crear suscripción en estado TRIALING
      const today = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(today.getDate() + 14);

      await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          plan: 'BASICO',
          status: 'TRIALING',
          currentPeriodStart: today,
          currentPeriodEnd: trialEndDate,
          trialEndsAt: trialEndDate,
        },
      });

      // 5. Crear toolAccess (solo HORARIOS habilitado)
      const tools = ['HORARIOS', 'INVENTARIO', 'RESERVAS', 'COMANDAS', 'ANALYTICS'];
      await Promise.all(
        tools.map((toolName) =>
          tx.toolAccess.create({
            data: {
              restaurantId: restaurant.id,
              toolName,
              isEnabled: toolName === 'HORARIOS',
            },
          })
        )
      );

      return { user: updatedUser, restaurant };
    });

    // Generar tokens
    const tokens = this.generateTokens(result.user);

    // Retornar respuesta sin password
    const { password: _, ...userWithoutPassword } = result.user;

    return {
      user: userWithoutPassword,
      tokens,
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name,
        address: result.restaurant.address,
        phone: result.restaurant.phone,
        email: result.restaurant.email,
        createdAt: result.restaurant.createdAt,
        updatedAt: result.restaurant.updatedAt,
      },
    };
  }

  generateTokens(user: {
    id: string;
    email: string;
    role: string;
    restaurantId: string | null;
  }): { accessToken: string; refreshToken: string } {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    // AccessToken expira en 15 minutos
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
    });

    // RefreshToken expira en 7 días
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  verifyToken(token: string, isRefreshToken = false): TokenPayload {
    const secret = isRefreshToken ? this.jwtRefreshSecret : this.jwtSecret;
    try {
      const decoded = jwt.verify(token, secret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verificar refresh token
    const decoded = this.verifyToken(refreshToken, true);

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Generar nuevos tokens
    return this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    });
  }
}

export default new AuthService();
