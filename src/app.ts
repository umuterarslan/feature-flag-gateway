import express from 'express';
import flagRoutes from '../src/routes/flag.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import '../src/grpc/server.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT;

const app = express();
app.use(express.json());
app.use('/api/flags', flagRoutes);
app.use(errorHandler);
app.listen(PORT, () => console.log(`Feature Flag Admin API running on ${PORT}`));
