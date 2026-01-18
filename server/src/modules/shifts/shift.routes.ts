import { Router } from 'express';
import shiftController from './shift.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /shifts/weekly?week=1&year=2024 - Horario semanal
router.get('/weekly', shiftController.getWeeklySchedule.bind(shiftController));

// GET /shifts/employee/:employeeId?startDate&endDate - Turnos de un empleado
router.get('/employee/:employeeId', shiftController.getByEmployee.bind(shiftController));

// POST /shifts/bulk - Crear múltiples turnos (debe ir antes de /shifts/:id)
router.post('/bulk', shiftController.bulkCreate.bind(shiftController));

// POST /shifts - Crear turno
router.post('/', shiftController.create.bind(shiftController));

// PUT /shifts/:id - Actualizar turno
router.put('/:id', shiftController.update.bind(shiftController));

// DELETE /shifts/:id - Eliminar turno
router.delete('/:id', shiftController.delete.bind(shiftController));

export default router;
