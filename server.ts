import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "postgresql-cloudsql" });
  });

  // API Routes for PostgreSQL Persistence (Drizzle ORM)
  app.get("/api/sheets", async (req, res) => {
    try {
      const { pgDb } = await import("./src/db/index");
      const { uploadedSheets } = await import("./src/db/schema");
      const sheets = await pgDb.select().from(uploadedSheets);
      res.json({ success: true, sheets });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/sheets/save", async (req, res) => {
    try {
      const { sheetInfo, records } = req.body;
      if (!sheetInfo || !records) {
        return res.status(400).json({ error: "Missing sheetInfo or records" });
      }

      const { pgDb } = await import("./src/db/index");
      const { uploadedSheets, sheetRecordChunks, systemState } = await import("./src/db/schema");
      const { eq } = await import("drizzle-orm");

      // 1. Reset isActive on old sheets if this one is active
      if (sheetInfo.isActive) {
        await pgDb.update(uploadedSheets).set({ isActive: false });
      }

      // 2. Insert or replace sheet metadata
      await pgDb.insert(uploadedSheets).values({
        id: sheetInfo.id,
        fileName: sheetInfo.fileName,
        uploadedAt: sheetInfo.uploadedAt,
        rowCount: sheetInfo.rowCount,
        totalAmount: sheetInfo.totalAmount,
        isActive: Boolean(sheetInfo.isActive),
      }).onConflictDoUpdate({
        target: uploadedSheets.id,
        set: {
          isActive: Boolean(sheetInfo.isActive),
          rowCount: sheetInfo.rowCount,
          totalAmount: sheetInfo.totalAmount,
        }
      });

      // 3. Save Chunks
      await pgDb.delete(sheetRecordChunks).where(eq(sheetRecordChunks.sheetId, sheetInfo.id));

      const CHUNK_SIZE = 400;
      const totalChunks = Math.ceil(records.length / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const chunk = records.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await pgDb.insert(sheetRecordChunks).values({
          sheetId: sheetInfo.id,
          chunkIndex: i,
          totalChunks,
          records: JSON.stringify(chunk),
          updatedAt: new Date().toISOString(),
        });
      }

      // 4. Update System State
      if (sheetInfo.isActive) {
        await pgDb.insert(systemState).values({
          key: 'active_dataset_state',
          activeSheetId: sheetInfo.id,
          fileName: sheetInfo.fileName,
          rowCount: records.length,
          updatedAt: new Date().toISOString(),
        }).onConflictDoUpdate({
          target: systemState.key,
          set: {
            activeSheetId: sheetInfo.id,
            fileName: sheetInfo.fileName,
            rowCount: records.length,
            updatedAt: new Date().toISOString(),
          }
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving sheet to PostgreSQL:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/sheets/active", async (req, res) => {
    try {
      const { pgDb } = await import("./src/db/index");
      const { uploadedSheets, sheetRecordChunks, systemState } = await import("./src/db/schema");
      const { eq } = await import("drizzle-orm");

      const state = await pgDb.select().from(systemState).where(eq(systemState.key, 'active_dataset_state'));
      let targetSheetId = state.length > 0 ? state[0].activeSheetId : null;

      if (!targetSheetId) {
        const allSheets = await pgDb.select().from(uploadedSheets);
        if (allSheets.length > 0) {
          targetSheetId = allSheets[0].id;
        }
      }

      if (!targetSheetId) {
        return res.json({ success: true, sheetInfo: null, records: null });
      }

      const sheetRes = await pgDb.select().from(uploadedSheets).where(eq(uploadedSheets.id, targetSheetId));
      const chunks = await pgDb.select().from(sheetRecordChunks).where(eq(sheetRecordChunks.sheetId, targetSheetId));

      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const allRecords: any[] = [];
      chunks.forEach((c) => {
        try {
          const parsed = JSON.parse(c.records);
          allRecords.push(...parsed);
        } catch (e) {
          console.error("Error parsing records chunk:", e);
        }
      });

      res.json({
        success: true,
        sheetInfo: sheetRes[0] || null,
        records: allRecords,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
