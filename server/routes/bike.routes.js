import { Router } from 'express';
import { createBike, deleteBike, getBike, listBikes, updateBike } from '../controllers/bike.controller.js';

export const bikeRoutes = Router();

bikeRoutes.get('/', listBikes);
bikeRoutes.get('/:id', getBike);
bikeRoutes.post('/', createBike);
bikeRoutes.put('/:id', updateBike);
bikeRoutes.delete('/:id', deleteBike);
