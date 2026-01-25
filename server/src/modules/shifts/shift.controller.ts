import { Response } from 'express';
import shiftService from './shift.service';
import { CreateShiftRequest, UpdateShiftRequest } from './shift.types';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

class ShiftController {
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
   * Validar formato de hora (HH:MM)
   */
  private validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validar formato de fecha
   */
  private validateDateFormat(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * GET /shifts/weekly?week=1&year=2024 - Obtener horario semanal
   */
  async getWeeklySchedule(req: AuthRequest, res: Response): Promise<void> {
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

      const week = parseInt(req.query.week as string);
      const year = parseInt(req.query.year as string);

      if (isNaN(week) || week < 1 || week > 53) {
        res.status(400).json({
          success: false,
          error: 'La semana debe ser un número entre 1 y 53',
        });
        return;
      }

      if (isNaN(year) || year < 2000 || year > 2100) {
        res.status(400).json({
          success: false,
          error: 'El año debe ser un número válido',
        });
        return;
      }

      const schedule = await shiftService.getWeeklySchedule(restaurantId, week, year);

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener horario semanal';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /shifts/employee/:employeeId?startDate&endDate - Obtener turnos de un empleado
   */
  async getByEmployee(req: AuthRequest, res: Response): Promise<void> {
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

      const { employeeId } = req.params;
      if (!employeeId) {
        res.status(400).json({
          success: false,
          error: 'ID de empleado es requerido',
        });
        return;
      }

      // Verificar que el empleado pertenece al restaurante
      const employee = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          restaurantId,
        },
      });

      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Empleado no encontrado',
        });
        return;
      }

      // Parsear fechas opcionales
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

      const shifts = await shiftService.getByEmployee(employeeId, restaurantId, startDate, endDate);

      res.status(200).json({
        success: true,
        data: shifts,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener turnos';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /shifts - Crear turno
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

      const { employeeId, date, startTime, endTime, type, notes }: CreateShiftRequest = req.body;

      // Validar inputs requeridos
      if (!employeeId || !date || !startTime || !endTime || !type) {
        res.status(400).json({
          success: false,
          error: 'employeeId, date, startTime, endTime y type son requeridos',
        });
        return;
      }

      // Validar formato de fecha
      if (!this.validateDateFormat(date)) {
        res.status(400).json({
          success: false,
          error: 'Formato de fecha inválido',
        });
        return;
      }

      // Validar formato de horas
      if (!this.validateTimeFormat(startTime)) {
        res.status(400).json({
          success: false,
          error: 'Formato de startTime inválido (debe ser HH:MM)',
        });
        return;
      }

      if (!this.validateTimeFormat(endTime)) {
        res.status(400).json({
          success: false,
          error: 'Formato de endTime inválido (debe ser HH:MM)',
        });
        return;
      }

      // Validar tipo
      const validTypes = ['MORNING', 'AFTERNOON', 'NIGHT', 'OFF'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`,
        });
        return;
      }

      const shift = await shiftService.create(
        { employeeId, date, startTime, endTime, type, notes },
        restaurantId
      );

      res.status(201).json({
        success: true,
        data: shift,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear turno';
      const statusCode = message.includes('Conflicto') || message.includes('no encontrado') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /shifts/bulk - Crear múltiples turnos
   */
  async bulkCreate(req: AuthRequest, res: Response): Promise<void> {
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

      const { shifts } = req.body;

      if (!Array.isArray(shifts) || shifts.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Se requiere un array de turnos',
        });
        return;
      }

      // Validar cada turno
      for (const shift of shifts) {
        if (!shift.employeeId || !shift.date || !shift.startTime || !shift.endTime || !shift.type) {
          res.status(400).json({
            success: false,
            error: 'Cada turno debe tener employeeId, date, startTime, endTime y type',
          });
          return;
        }

        if (!this.validateDateFormat(shift.date)) {
          res.status(400).json({
            success: false,
            error: `Formato de fecha inválido en turno: ${JSON.stringify(shift)}`,
          });
          return;
        }

        if (!this.validateTimeFormat(shift.startTime) || !this.validateTimeFormat(shift.endTime)) {
          res.status(400).json({
            success: false,
            error: `Formato de hora inválido en turno: ${JSON.stringify(shift)}`,
          });
          return;
        }
      }

      const createdShifts = await shiftService.bulkCreate(shifts, restaurantId);

      res.status(201).json({
        success: true,
        data: createdShifts,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear turnos';
      const statusCode = message.includes('Conflicto') || message.includes('no pertenecen') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /shifts/:id - Actualizar turno
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

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID de turno es requerido',
        });
        return;
      }

      const data: UpdateShiftRequest = req.body;

      // Validar formato de fecha si se proporciona
      if (data.date && !this.validateDateFormat(data.date)) {
        res.status(400).json({
          success: false,
          error: 'Formato de fecha inválido',
        });
        return;
      }

      // Validar formato de horas si se proporcionan
      if (data.startTime && !this.validateTimeFormat(data.startTime)) {
        res.status(400).json({
          success: false,
          error: 'Formato de startTime inválido (debe ser HH:MM)',
        });
        return;
      }

      if (data.endTime && !this.validateTimeFormat(data.endTime)) {
        res.status(400).json({
          success: false,
          error: 'Formato de endTime inválido (debe ser HH:MM)',
        });
        return;
      }

      // Validar tipo si se proporciona
      if (data.type) {
        const validTypes = ['MORNING', 'AFTERNOON', 'NIGHT', 'OFF'];
        if (!validTypes.includes(data.type)) {
          res.status(400).json({
            success: false,
            error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`,
          });
          return;
        }
      }

      const shift = await shiftService.update(id, data, restaurantId);

      res.status(200).json({
        success: true,
        data: shift,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar turno';
      const statusCode = message.includes('no encontrado') || message.includes('Conflicto') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /shifts - Obtener todos los turnos del restaurante
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

      const shifts = await prisma.shift.findMany({
        where: {
          restaurantId,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              position: true,
              color: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      res.status(200).json({
        success: true,
        data: shifts,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener turnos';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * DELETE /shifts/:id - Eliminar turno
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

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID de turno es requerido',
        });
        return;
      }

      await shiftService.delete(id, restaurantId);

      res.status(200).json({
        success: true,
        message: 'Turno eliminado correctamente',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar turno';
      const statusCode = message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }
}

export default new ShiftController();
