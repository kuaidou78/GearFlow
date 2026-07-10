import { Router } from 'express';
import { routePreview, weatherAssessment } from '../controllers/ride-planner.controller.js';

export const ridePlannerRoutes = Router();

ridePlannerRoutes.post('/weather-assessment', weatherAssessment);
ridePlannerRoutes.post('/route-preview', routePreview);
