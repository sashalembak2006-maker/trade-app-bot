import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.create({ data: { email, passwordHash } });
  console.log(`Admin seeded: ${email}`);
}
