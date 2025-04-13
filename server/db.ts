import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection configuration
const connectionConfig = {
  host: '217.21.74.127',
  user: 'u856729253_renew_user',
  password: 'Coinage@1790',
  database: 'u856729253_renew',
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
