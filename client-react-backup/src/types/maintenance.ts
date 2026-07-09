import { Gear } from './gear';

export type MaintenanceType = 'cleaning' | 'tires' | 'chain' | 'brakes' | 'drivetrain' | 'full_service' | 'other';

export type Maintenance = {
  id: string;
  gearId: string;
  type: MaintenanceType;
  title: string;
  maintenanceDate: string;
  cost: number;
  nextDueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  gear?: Pick<Gear, 'id' | 'name' | 'category' | 'brand'>;
};

export type MaintenanceInput = {
  gearId: string;
  type: MaintenanceType;
  title: string;
  maintenanceDate: string;
  cost: number;
  nextDueDate?: string;
  notes?: string;
};
