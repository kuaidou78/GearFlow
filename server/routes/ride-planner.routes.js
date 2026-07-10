import { Router } from 'express';
import { integratedRidePlan, placeSearch, routePreview, weatherAssessment } from '../controllers/ride-planner.controller.js';

export const ridePlannerRoutes = Router();

ridePlannerRoutes.post('/weather-assessment', weatherAssessment);
ridePlannerRoutes.post('/route-preview', routePreview);
ridePlannerRoutes.post('/plan', integratedRidePlan);
ridePlannerRoutes.get('/places/search', placeSearch);
