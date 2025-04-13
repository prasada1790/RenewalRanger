
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection configuration
const connectionConfig = {
  host: process.env.DB_HOST || '217.21.74.127',
  user: process.env.DB_USER || 'u856729253_renew_user',
  password: process.env.DB_PASSWORD || 'Coinage@1790',
  database: process.env.DB_NAME || 'u856729253_renew',
  // Additional connection options
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
export const pool = mysql.createPool(connectionConfig);

// Create Drizzle ORM instance with default mode
export const db = drizzle(pool, { 
  schema,
  mode: 'default' // Required parameter for MySQL
});
