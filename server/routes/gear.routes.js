import { Router } from 'express';
import { createGear, deleteGear, getGear, listGears, previewGearValuation, updateGear } from '../controllers/gear.controller.js';

export const gearRoutes = Router();

gearRoutes.get('/', listGears);
gearRoutes.post('/:id/valuation/preview', previewGearValuation);
gearRoutes.get('/:id', getGear);
gearRoutes.post('/', createGear);
gearRoutes.put('/:id', updateGear);
gearRoutes.delete('/:id', deleteGear);
