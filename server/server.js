import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { authRoutes } from './routes/auth.routes.js';
import { bikeRoutes } from './routes/bike.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { gearRoutes } from './routes/gear.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { insightsRoutes } from './routes/insights.routes.js';
import { maintenanceRoutes } from './routes/maintenance.routes.js';
import { rideRoutes } from './routes/ride.routes.js';
import { statusRoutes } from './routes/status.routes.js';
import { wishlistRoutes } from './routes/wishlist.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/health', healthRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/bikes', requireAuth, bikeRoutes);
app.use('/api/rides', requireAuth, rideRoutes);
app.use('/api/gears', requireAuth, gearRoutes);
app.use('/api/maintenance', requireAuth, maintenanceRoutes);
app.use('/api/wishlist', requireAuth, wishlistRoutes);
app.use('/api/insights', requireAuth, insightsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`GearFlow API listening on http://localhost:${port}`);
});
