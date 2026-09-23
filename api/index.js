import { app } from '../src/index.js';
import { connectDb } from '../src/config/db.js';

let connPromise = null;

function ensureDb() {
  if (!connPromise) {
    connPromise = connectDb().catch((e) => {
      connPromise = null;
      throw e;
    });
  }
  return connPromise;
}

export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch (e) {
    return res.status(500).json({ message: 'Database connection failed' });
  }
  return app(req, res);
}