import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL is not set in your environment.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function runBackup() {
  console.log("🚀 Starting Luna Salon OS Database Backup...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");

  try {
    // 1. Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 2. Fetch all database tables in parallel for complete state snapshotting
    console.log("📦 Querying relational database tables...");
    const [
      salons,
      users,
      services,
      bookings,
      resources,
      cashSessions,
      transactions,
      invoices,
      auditLogs,
    ] = await Promise.all([
      prisma.salon.findMany(),
      prisma.user.findMany(),
      prisma.service.findMany(),
      prisma.booking.findMany(),
      prisma.resource.findMany(),
      prisma.cashSession.findMany(),
      prisma.transaction.findMany(),
      prisma.invoice.findMany(),
      prisma.auditLog.findMany(),
    ]);

    const snapshot = {
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        tableCounts: {
          salons: salons.length,
          users: users.length,
          services: services.length,
          bookings: bookings.length,
          resources: resources.length,
          cashSessions: cashSessions.length,
          transactions: transactions.length,
          invoices: invoices.length,
          auditLogs: auditLogs.length,
        },
      },
      data: {
        salons,
        users,
        services,
        bookings,
        resources,
        cashSessions,
        transactions,
        invoices,
        auditLogs,
      },
    };

    // 3. Save snapshot to disk
    const backupFilePath = path.join(backupDir, `luna-backup-${timestamp}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(snapshot, null, 2), "utf-8");
    console.log(`✅ Success! Database backup saved to: ${backupFilePath}`);

    // 4. Auto-prune old backups (Keep only the 5 most recent snapshots to prevent storage bloat)
    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("luna-backup-") && file.endsWith(".json"))
      .map((file) => ({
        name: file,
        filePath: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 5) {
      console.log("🧹 Pruning older snapshots...");
      const filesToDelete = files.slice(5);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.filePath);
        console.log(`🗑️ Deleted legacy backup: ${file.name}`);
      }
    }

    console.log("🎉 Backup task finished successfully.");
  } catch (error) {
    console.error("❌ Database backup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void runBackup();
