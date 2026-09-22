import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  mongoose.set('toJSON', { virtuals: true });
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}