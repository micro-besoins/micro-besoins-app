<<<<<<< HEAD
import type { AuthPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
=======
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string };
>>>>>>> MB-36-developper-les-api-du-tableau-de-bord-administrateur
    }
  }
}

<<<<<<< HEAD
export {};
=======
export {};
>>>>>>> MB-36-developper-les-api-du-tableau-de-bord-administrateur
