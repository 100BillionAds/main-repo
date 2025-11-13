import { PrismaClient } from '../../generated/prisma';

// Reuse PrismaClient across hot reloads in development to avoid exhausting connections
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prismaClient || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prismaClient = prisma;

export default prisma;
