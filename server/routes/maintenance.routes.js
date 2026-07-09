import { Router } from 'express';
import { createMaintenance, deleteMaintenance, getMaintenance, listMaintenance, updateMaintenance } from '../controllers/maintenance.controller.js';

export const maintenanceRoutes = Router();

maintenanceRoutes.get('/', listMaintenance);
maintenanceRoutes.get('/:id', getMaintenance);
maintenanceRoutes.post('/', createMaintenance);
maintenanceRoutes.put('/:id', updateMaintenance);
maintenanceRoutes.delete('/:id', deleteMaintenance);
