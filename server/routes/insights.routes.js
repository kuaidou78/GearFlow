import { Router } from 'express';
import { insightsOverview } from '../controllers/insights.controller.js';

export const insightsRoutes = Router();

insightsRoutes.get('/overview', insightsOverview);
