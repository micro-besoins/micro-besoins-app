import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import routes from './routes';

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;