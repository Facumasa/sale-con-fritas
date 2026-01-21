import { Router } from 'express';
import aiController from './ai.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// POST /ai/generate - Generar horario con IA
router.post('/generate', aiController.generateSchedule.bind(aiController));

// POST /ai/optimize - Optimizar horario existente
router.post('/optimize', aiController.optimizeSchedule.bind(aiController));

// POST /ai/chat - Chat conversacional con IA
router.post('/chat', aiController.chatWithAI.bind(aiController));

// POST /ai/explain-conflicts - Explicar conflictos en un horario
router.post('/explain-conflicts', aiController.explainConflicts.bind(aiController));

export default router;
