import express from 'express';
import flagRoutes from './routes/flag.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { auth } from './middlewares/auth.middleware.js';
import './grpc/server.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT;

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/flags', auth, flagRoutes);
app.use(errorHandler);
app.listen(PORT, () => console.log(`Feature Flag Admin API running on ${PORT}`));
