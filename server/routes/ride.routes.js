import { Router } from 'express';
import { createRide, deleteRide, getRide, listRides, updateRide } from '../controllers/ride.controller.js';

export const rideRoutes = Router();

rideRoutes.get('/', listRides);
rideRoutes.get('/:id', getRide);
rideRoutes.post('/', createRide);
rideRoutes.put('/:id', updateRide);
rideRoutes.delete('/:id', deleteRide);
