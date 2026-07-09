import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../services/session.service.js';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production. Seed data is for local demo initialization only.');
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} user records already exist.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: 'Demo Rider',
      email: process.env.DEMO_EMAIL || 'demo@gearflow.app',
      passwordHash: hashPassword(process.env.DEMO_PASSWORD || 'ride123'),
      role: 'admin'
    }
  });

  const tarmacBike = await prisma.bike.create({
    data: {
      userId: user.id,
      name: 'Tarmac SL8',
      brand: 'Specialized',
      model: 'SL8 Comp',
      bikeType: 'road',
      purchaseDate: new Date('2024-03-12'),
      notes: 'Main road bike for weekend climbs and fast group rides.'
    }
  });

  const gravelBike = await prisma.bike.create({
    data: {
      userId: user.id,
      name: 'Checkpoint ALR',
      brand: 'Trek',
      model: 'ALR 5',
      bikeType: 'gravel',
      purchaseDate: new Date('2023-08-20'),
      notes: 'Backup bike for mixed surface training.'
    }
  });

  await prisma.ride.createMany({
    data: [
      {
        userId: user.id,
        bikeId: tarmacBike.id,
        title: 'Morning endurance loop',
        rideDate: new Date('2026-06-28'),
        distanceKm: 68.4,
        durationMin: 152,
        elevationM: 540,
        route: 'Riverside - East Hill - Riverside',
        notes: 'Steady Z2 ride.'
      },
      {
        userId: user.id,
        bikeId: tarmacBike.id,
        title: 'Fast group ride',
        rideDate: new Date('2026-07-02'),
        distanceKm: 82.7,
        durationMin: 176,
        elevationM: 710,
        route: 'City loop',
        notes: 'Good pacing, check rear brake rub.'
      },
      {
        userId: user.id,
        bikeId: gravelBike.id,
        title: 'Gravel recovery spin',
        rideDate: new Date('2026-07-06'),
        distanceKm: 35.2,
        durationMin: 94,
        elevationM: 210,
        route: 'Canal path',
        notes: 'Easy ride after rain.'
      }
    ]
  });

  const tarmac = await prisma.gear.create({
    data: {
      userId: user.id,
      bikeId: tarmacBike.id,
      name: 'Tarmac SL8 Comp Frameset',
      category: 'bike',
      brand: 'Specialized',
      model: 'SL8 Comp',
      purchasePrice: 35800,
      purchaseDate: new Date('2024-03-12'),
      expectedLifespanMonths: 72,
      condition: 'excellent',
      minResidualRate: 0.28,
      notes: 'Primary road bike asset record.'
    }
  });

  const wheels = await prisma.gear.create({
    data: {
      userId: user.id,
      bikeId: tarmacBike.id,
      name: 'Aeolus Pro 51 Wheelset',
      category: 'wheelset',
      brand: 'Bontrager',
      model: 'Aeolus Pro 51',
      purchasePrice: 9800,
      purchaseDate: new Date('2023-09-02'),
      expectedLifespanMonths: 60,
      condition: 'good',
      minResidualRate: 0.22,
      notes: 'Carbon wheelset for flat routes.'
    }
  });

  const computer = await prisma.gear.create({
    data: {
      userId: user.id,
      name: 'Edge 1050',
      category: 'computer',
      brand: 'Garmin',
      model: '1050',
      purchasePrice: 5480,
      purchaseDate: new Date('2025-05-18'),
      expectedLifespanMonths: 48,
      condition: 'excellent',
      minResidualRate: 0.3,
      notes: 'Navigation and training computer.'
    }
  });

  await prisma.gear.createMany({
    data: [
      {
        userId: user.id,
        name: 'S-Works Prevail 3',
        category: 'helmet',
        brand: 'Specialized',
        model: 'Prevail 3',
        purchasePrice: 2280,
        purchaseDate: new Date('2024-06-05'),
        expectedLifespanMonths: 36,
        condition: 'good',
        minResidualRate: 0.15,
        notes: 'Summer helmet.'
      },
      {
        userId: user.id,
        name: 'RC9 Cycling Shoes',
        category: 'shoes',
        brand: 'Shimano',
        model: 'RC9',
        purchasePrice: 2680,
        purchaseDate: new Date('2022-11-11'),
        expectedLifespanMonths: 48,
        condition: 'fair',
        minResidualRate: 0.12,
        notes: 'Race-fit shoes.'
      }
    ]
  });

  await prisma.maintenance.createMany({
    data: [
      {
        userId: user.id,
        gearId: tarmac.id,
        type: 'drivetrain',
        title: 'Chain wax and drivetrain inspection',
        maintenanceDate: new Date('2026-06-20'),
        cost: 120,
        nextDueDate: new Date('2026-08-20'),
        notes: 'Chain wear still under limit.'
      },
      {
        userId: user.id,
        gearId: wheels.id,
        type: 'tires',
        title: 'Tubeless sealant refresh',
        maintenanceDate: new Date('2026-05-28'),
        cost: 95,
        nextDueDate: new Date('2026-07-28'),
        notes: 'Rear tire has small cut, monitor before long descent.'
      },
      {
        userId: user.id,
        gearId: computer.id,
        type: 'other',
        title: 'Firmware and mount check',
        maintenanceDate: new Date('2026-04-10'),
        cost: 0,
        nextDueDate: null,
        notes: 'Updated maps and sensor pairing.'
      }
    ]
  });

  await prisma.wishlistItem.createMany({
    data: [
      {
        userId: user.id,
        name: 'Power meter crankset',
        category: 'drivetrain',
        brand: 'Shimano',
        estimatedPrice: 4200,
        priority: 'high',
        plannedMonth: '2026-09',
        status: 'planned',
        reason: 'Better structured training data.',
        notes: 'Compare left-only vs dual-sided.'
      },
      {
        userId: user.id,
        name: 'Aero road helmet',
        category: 'helmet',
        brand: 'Kask',
        estimatedPrice: 2100,
        priority: 'medium',
        plannedMonth: '2026-10',
        status: 'watching',
        reason: 'Race-day upgrade.',
        notes: 'Wait for discount.'
      }
    ]
  });

  console.log('Seed complete: GearFlow MySQL demo data created.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
