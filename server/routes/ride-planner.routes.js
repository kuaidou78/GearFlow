import { Router } from 'express';
import { weatherAssessment } from '../controllers/ride-planner.controller.js';

export const ridePlannerRoutes = Router();

ridePlannerRoutes.post('/weather-assessment', weatherAssessment);
