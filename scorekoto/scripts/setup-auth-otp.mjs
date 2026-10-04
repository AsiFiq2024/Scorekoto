import { readFile } from "node:fs/promises";
import pool from "../src/app/lib/db.js";

const migrationUrl = new URL("../database/auth_otp_setup.sql", import.meta.url);
const migration = await readFile(migrationUrl, "utf8");

try {
  await pool.query(migration);
  const { rows } = await pool.query(
    `SELECT
       to_regclass('public.auth_otp_challenge') IS NOT NULL AS otp_table_ready,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'auth_version'
       ) AS auth_version_ready`
  );
  console.log(JSON.stringify(rows[0]));
} finally {
  await pool.end();
}
