import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import gigRoutes from './routes/gig.routes';
import paymentRoutes from './routes/payment.routes';
import conversationRoutes from './routes/conversation.routes';
import { notFound } from './middleware/not-found';
import routes from './routes';
// import 'express-async-errors';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/conversations', conversationRoutes);

app.use('/api', routes);

app.use(errorHandler);
app.use(notFound);

export default app;
