import { Response } from 'express';
import attendanceService from './attendance.service';
import { CheckInRequest, CheckOutRequest, UpdateAttendanceRequest } from './attendance.types';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

class AttendanceController {
  private async getUserRestaurantId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        restaurant: true,
        ownedRestaurant: true,
      },
    });
    if (!user) return null;
    return user.ownedRestaurant?.id ?? user.restaurantId ?? null;
  }

  /**
   * POST /attendance/check-in
   */
  async checkIn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const body = req.body as CheckInRequest;
      if (!body.employeeId || !body.pin) {
        res.status(400).json({ success: false, error: 'employeeId y pin son requeridos' });
        return;
      }

      const attendance = await attendanceService.checkIn(body, restaurantId);
      res.status(201).json({ success: true, data: attendance });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al registrar entrada',
      });
    }
  }

  /**
   * POST /attendance/check-out
   */
  async checkOut(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const body = req.body as CheckOutRequest;
      if (!body.attendanceId) {
        res.status(400).json({ success: false, error: 'attendanceId es requerido' });
        return;
      }

      const attendance = await attendanceService.checkOut(body, restaurantId);
      res.json({ success: true, data: attendance });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al registrar salida',
      });
    }
  }

  /**
   * GET /attendance?employeeId=&startDate=&endDate=&date=
   */
  async getAttendances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const employeeId = req.query.employeeId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;

      const list = await attendanceService.getAttendances({
        restaurantId,
        employeeId,
        startDate,
        endDate,
        date,
      });
      res.json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al listar asistencias',
      });
    }
  }

  /**
   * GET /attendance/today
   */
  async getTodayAttendances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const summary = await attendanceService.getTodayAttendances(restaurantId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener resumen del día',
      });
    }
  }

  /**
   * GET /attendance/stats
   */
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const stats = await attendanceService.getStats(restaurantId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener estadísticas',
      });
    }
  }

  /**
   * GET /attendance/report/monthly?year=&month=
   */
  async getMonthlyReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const year = parseInt(req.query.year as string);
      const month = parseInt(req.query.month as string);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({ success: false, error: 'year y month válidos son requeridos' });
        return;
      }

      const report = await attendanceService.getMonthlyReport(restaurantId, year, month);
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al generar reporte mensual',
      });
    }
  }

  /**
   * GET /attendance/employee/:employeeId?startDate=&endDate=
   */
  async getEmployeeAttendances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const { employeeId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const list = await attendanceService.getEmployeeAttendances(
        employeeId,
        restaurantId,
        startDate,
        endDate
      );
      res.json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al listar asistencias del empleado',
      });
    }
  }

  /**
   * POST /attendance/employee/:employeeId/generate-pin (admin)
   */
  async generatePin(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const { employeeId } = req.params;
      const result = await attendanceService.generatePin(employeeId, restaurantId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al generar PIN',
      });
    }
  }

  /**
   * PUT /attendance/:id (admin)
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const { id } = req.params;
      const body = req.body as UpdateAttendanceRequest;
      const attendance = await attendanceService.updateAttendance(id, body, restaurantId);
      res.json({ success: true, data: attendance });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al actualizar asistencia',
      });
    }
  }

  /**
   * DELETE /attendance/:id (admin)
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
      }

      const restaurantId = await this.getUserRestaurantId(userId);
      if (!restaurantId) {
        res.status(403).json({ success: false, error: 'Usuario sin acceso al restaurante' });
        return;
      }

      const { id } = req.params;
      await attendanceService.deleteAttendance(id, restaurantId);
      res.json({ success: true, message: 'Asistencia eliminada' });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Error al eliminar asistencia',
      });
    }
  }
}

export default new AttendanceController();
