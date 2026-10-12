import app from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`API Micro-Besoins démarrée sur http://localhost:${env.port}`);
});
