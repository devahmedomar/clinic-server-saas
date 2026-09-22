import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from '../src/config/db.js';
import User from '../src/models/User.js';

const email = process.env.OWNER_EMAIL || 'owner@yourclinic.app';
const password = process.env.OWNER_PASSWORD || 'owner123';

async function main() {
  await connectDb();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Owner already exists: ${email}`);
    process.exit(0);
  }
  await User.create({
    role: 'owner',
    name: process.env.OWNER_NAME || 'Platform Owner',
    email,
    passwordHash: await bcrypt.hash(password, 10),
    status: 'active',
  });
  console.log(`Created owner: ${email} / ${password}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});