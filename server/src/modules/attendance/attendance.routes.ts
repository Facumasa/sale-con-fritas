import { Router } from 'express';
import attendanceController from './attendance.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Rutas públicas (SIN auth) - ANTES de router.use(authenticateToken)
router.post('/public/check-in', (req, res) => attendanceController.checkInPublic(req, res));
router.post('/public/check-out', (req, res) => attendanceController.checkOutPublic(req, res));
router.get('/public/:publicToken/info', (req, res) => attendanceController.getPublicFichajeInfo(req, res));
router.get('/public/:publicToken/employees', (req, res) => attendanceController.getPublicFichajeEmployees(req, res));
router.get('/public/:publicToken/employee/:employeeId/status', (req, res) => attendanceController.getPublicEmployeeStatus(req, res));
router.get('/public/:publicToken/employee/:employeeId/today', (req, res) => attendanceController.getPublicEmployeeToday(req, res));
router.post('/request-pin-change', (req, res) => attendanceController.requestPinChange(req, res));
router.post('/verify-pin-token', (req, res) => attendanceController.verifyPinToken(req, res));
router.post('/change-pin', (req, res) => attendanceController.changePin(req, res));
router.post('/forgot-pin', (req, res) => attendanceController.forgotPin(req, res));

router.use(authenticateToken);

// POST /attendance/check-in
router.post('/check-in', attendanceController.checkIn.bind(attendanceController));

// POST /attendance/check-out
router.post('/check-out', attendanceController.checkOut.bind(attendanceController));

// GET /attendance
router.get('/', attendanceController.getAttendances.bind(attendanceController));

// GET /attendance/today
router.get('/today', attendanceController.getTodayAttendances.bind(attendanceController));

// GET /attendance/stats
router.get('/stats', attendanceController.getStats.bind(attendanceController));

// GET /attendance/report/monthly
router.get('/report/monthly', attendanceController.getMonthlyReport.bind(attendanceController));

// GET /attendance/employee/:employeeId
router.get('/employee/:employeeId', attendanceController.getEmployeeAttendances.bind(attendanceController));

// POST /attendance/employee/:employeeId/generate-pin (admin)
router.post('/employee/:employeeId/generate-pin', attendanceController.generatePin.bind(attendanceController));

// PUT /attendance/:id (admin)
router.put('/:id', attendanceController.update.bind(attendanceController));

// DELETE /attendance/:id (admin)
router.delete('/:id', attendanceController.delete.bind(attendanceController));

export default router;
