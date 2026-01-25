import { Response } from 'express';
import employeeService from './employee.service';
import { CreateEmployeeRequest, UpdateEmployeeRequest } from './employee.types';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

class EmployeeController {
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
    return user.ownedRestaurant?.id ?? user.restaurantId;
  }

  /**
   * GET /employees - Listar empleados del restaurante del usuario
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
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

      const employees = await employeeService.getAll(restaurantId);

      res.status(200).json({
        success: true,
        data: employees,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener empleados';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /employees/:id - Obtener empleado por ID
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
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

      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID de empleado es requerido',
        });
        return;
      }

      const employee = await employeeService.getById(id, restaurantId);

      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener empleado';
      const statusCode = message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /employees - Crear empleado
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
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

      const { name, position, hourlyRate, phone, color }: CreateEmployeeRequest = req.body;

      // Validar inputs requeridos
      if (!name || !position) {
        res.status(400).json({
          success: false,
          error: 'Nombre y posición son requeridos',
        });
        return;
      }

      // Validar hourlyRate si se proporciona
      if (hourlyRate !== undefined && (hourlyRate < 0 || isNaN(hourlyRate))) {
        res.status(400).json({
          success: false,
          error: 'La tarifa por hora debe ser un número positivo',
        });
        return;
      }

      // Validar formato de color si se proporciona
      if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        res.status(400).json({
          success: false,
          error: 'El color debe ser un código hexadecimal válido (ej: #3b82f6)',
        });
        return;
      }

      // Verificar límite de empleados según plan
      const canCreate = await employeeService.checkEmployeeLimit(restaurantId);
      if (!canCreate) {
        res.status(403).json({
          success: false,
          error: 'Has alcanzado el límite de empleados para tu plan de suscripción',
        });
        return;
      }

      const employee = await employeeService.create(
        { name, position, hourlyRate, phone, color },
        restaurantId
      );

      res.status(201).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear empleado';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /employees/:id - Actualizar empleado
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
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

      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID de empleado es requerido',
        });
        return;
      }

      const data: UpdateEmployeeRequest = req.body;

      // Validar hourlyRate si se proporciona
      if (data.hourlyRate !== undefined && (data.hourlyRate < 0 || isNaN(data.hourlyRate))) {
        res.status(400).json({
          success: false,
          error: 'La tarifa por hora debe ser un número positivo',
        });
        return;
      }

      // Validar formato de color si se proporciona
      if (data.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.color)) {
        res.status(400).json({
          success: false,
          error: 'El color debe ser un código hexadecimal válido (ej: #3b82f6)',
        });
        return;
      }

      const employee = await employeeService.update(id, data, restaurantId);

      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar empleado';
      const statusCode = message.includes('no encontrado') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /employees/:id - Soft delete (marcar como inactivo)
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
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

      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID de empleado es requerido',
        });
        return;
      }

      await employeeService.delete(id, restaurantId);

      res.status(200).json({
        success: true,
        message: 'Empleado eliminado correctamente',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar empleado';
      const statusCode = message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /employees/:id/stats - Obtener estadísticas del empleado
   */
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
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

      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID de empleado es requerido',
        });
        return;
      }

      // Parsear fechas opcionales de query params
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Validar fechas
      if (startDate && isNaN(startDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Fecha de inicio inválida',
        });
        return;
      }

      if (endDate && isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Fecha de fin inválida',
        });
        return;
      }

      const stats = await employeeService.getStats(id, restaurantId, startDate, endDate);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener estadísticas';
      const statusCode = message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }
}

export default new EmployeeController();
