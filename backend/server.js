import app from "./app.js";
import { verifyDbConnection } from "./db/client.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log("🔍 Probing Database Connectivity...");
  let isDbConnected = false;

  try {
    isDbConnected = await verifyDbConnection(3);
  } catch (error) {
    console.warn("⚠️ [Warning] Running in offline/degraded mode. DB operations will fallback to in-memory store.");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Reconcile.ai Engine API Server running on port ${PORT}`);
    if (isDbConnected) {
      console.log(`📡 Database Mode: LIVE NEON POSTGRES`);
    } else {
      console.log(`📡 Database Mode: DEGRADED / IN-MEMORY FALLBACK (Check network connection)`);
    }
  });
}

startServer();
