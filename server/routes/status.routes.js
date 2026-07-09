import { Router } from 'express';
import { status } from '../controllers/status.controller.js';

export const statusRoutes = Router();

statusRoutes.get('/', status);
