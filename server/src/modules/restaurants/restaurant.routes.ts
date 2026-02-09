import { Router } from 'express';
import restaurantController from './restaurant.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/me', (req, res) => restaurantController.getMyRestaurant(req, res));
router.put('/:id', (req, res) => restaurantController.update(req, res));
router.post('/:id/generate-fichaje-token', (req, res) =>
  restaurantController.generateFichajeToken(req, res)
);

export default router;
