import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const sql = connectionString ? neon(connectionString) : null;
export const db = sql ? drizzle(sql, { schema }) : null;

/**
 * Tests Neon Postgres database connectivity upon server startup with auto-retry.
 * Handles transient network/cold-start 'fetch failed' errors gracefully.
 */
export async function verifyDbConnection(maxRetries = 3) {
  if (!connectionString) {
    console.error("❌ [Database Error] DATABASE_URL is missing in environment variables!");
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sql`SELECT 1;`;
      console.log("✅ [Database] Neon Postgres DB connected successfully!");
      return true;
    } catch (error) {
      console.warn(
        `⚠️ [Database Connection Attempt ${attempt}/${maxRetries} Failed]: ${error.message}`
      );
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 1500)); // Wait 1.5s before retrying
      } else {
        console.error(
          "❌ [Database Error] Unable to connect to Neon Postgres after multiple attempts."
        );
        console.error("👉 Please verify internet connectivity and DATABASE_URL in backend/.env.");
        throw error;
      }
    }
  }
}
