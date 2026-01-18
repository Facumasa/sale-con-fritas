import { Router } from 'express';
import employeeController from './employee.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /employees - Listar empleados del restaurante
router.get('/', employeeController.getAll.bind(employeeController));

// GET /employees/:id - Obtener empleado por ID
router.get('/:id', employeeController.getById.bind(employeeController));

// POST /employees - Crear empleado
router.post('/', employeeController.create.bind(employeeController));

// PUT /employees/:id - Actualizar empleado
router.put('/:id', employeeController.update.bind(employeeController));

// DELETE /employees/:id - Soft delete (marcar como inactivo)
router.delete('/:id', employeeController.delete.bind(employeeController));

// GET /employees/:id/stats - Obtener estadísticas del empleado
router.get('/:id/stats', employeeController.getStats.bind(employeeController));

export default router;
