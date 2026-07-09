import { Router } from 'express';
import { dashboardSummary } from '../controllers/dashboard.controller.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/summary', dashboardSummary);
