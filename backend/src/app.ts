import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import gigRoutes from './routes/gig.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

export default app;
