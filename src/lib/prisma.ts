import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === "production";
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: isProduction ? 10 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...(isProduction && {
      ssl: {
        // Use AWS RDS CA bundle when available, otherwise allow RDS certs
        rejectUnauthorized: !!process.env.RDS_CA_CERT_PATH,
        ...(process.env.RDS_CA_CERT_PATH && {
          ca: fs.readFileSync(process.env.RDS_CA_CERT_PATH, 'utf8'),
        }),
      },
    }),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
