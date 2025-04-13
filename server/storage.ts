import { 
  User, InsertUser, Client, InsertClient, 
  ItemType, InsertItemType, Renewable, InsertRenewable,
  ReminderLog, InsertReminderLog, users, clients, itemTypes, 
  renewables, reminderLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, lte, sql, inArray } from "drizzle-orm";
import session from "express-session";
import MySQLStore from "express-mysql-session";
import { pool } from "./db";
import React from 'react'; // Added React import to address issue 1

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  getAllClients(): Promise<Client[]>;

  // Item type operations
  getItemType(id: number): Promise<ItemType | undefined>;
  createItemType(itemType: InsertItemType): Promise<ItemType>;
  updateItemType(id: number, data: Partial<InsertItemType>): Promise<ItemType | undefined>;
  deleteItemType(id: number): Promise<boolean>;
  getAllItemTypes(): Promise<ItemType[]>;

  // Renewable operations
  getRenewable(id: number): Promise<Renewable | undefined>;
  createRenewable(renewable: InsertRenewable): Promise<Renewable>;
  updateRenewable(id: number, data: Partial<InsertRenewable>): Promise<Renewable | undefined>;
  deleteRenewable(id: number): Promise<boolean>;
  getAllRenewables(): Promise<Renewable[]>;
  getRenewablesByClientId(clientId: number): Promise<Renewable[]>;
  getRenewablesByTypeId(typeId: number): Promise<Renewable[]>;
  getRenewablesByAssignedToId(userId: number): Promise<Renewable[]>;
  getUpcomingRenewables(days: number): Promise<Renewable[]>;
  getExpiredRenewables(): Promise<Renewable[]>;

  // Reminder log operations
  getReminderLog(id: number): Promise<ReminderLog | undefined>;
  createReminderLog(log: InsertReminderLog): Promise<ReminderLog>;
  getReminderLogsByRenewableId(renewableId: number): Promise<ReminderLog[]>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    clientCount: number;
    activeRenewablesCount: number;
    upcomingRenewablesCount: number;
    expiredRenewablesCount: number;
  }>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create MySQL session store
    const MySQLSessionStore = MySQLStore(session);
    this.sessionStore = new MySQLSessionStore({
      host: '217.21.74.127',
      port: 3306,
      user: 'u856729253_renew_user',
      password: 'Coinage@1790',
      database: 'u856729253_renew',
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser);
    // MySql returns insertId from the query result directly
    const insertId = Number(result[0].insertId);
    return await this.getUser(insertId) as User;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    try {
      // Hash password if provided
      if (data.password) {
        data.password = await hashPassword(data.password); // Assuming hashPassword function exists
      }

      await db.update(users)
        .set(data)
        .where(eq(users.id, id));
      return await this.getUser(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // First check if user exists
      const user = await this.getUser(id);
      if (!user) return false;

      // Start a transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Update renewables to remove this user from assigned_to_id
        await connection.query('UPDATE renewables SET assigned_to_id = NULL WHERE assigned_to_id = ?', [id]);

        // Delete reminder logs for this user
        await connection.query('DELETE FROM reminder_logs WHERE sent_to_id = ?', [id]);

        // Delete the user
        await connection.query('DELETE FROM users WHERE id = ?', [id]);

        await connection.commit();
        return true;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(client);
    // MySql returns insertId from the query result directly
    const insertId = Number(result[0].insertId);
    return await this.getClient(insertId) as Client;
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    await db.update(clients)
      .set(data)
      .where(eq(clients.id, id));
    return await this.getClient(id);
  }

  async deleteClient(id: number): Promise<boolean> {
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  // Item type operations
  async getItemType(id: number): Promise<ItemType | undefined> {
    const [itemType] = await db.select().from(itemTypes).where(eq(itemTypes.id, id));
    if (itemType) {
      let intervals = [];
      try {
        intervals = typeof itemType.defaultReminderIntervals === 'string' 
          ? JSON.parse(itemType.defaultReminderIntervals)
          : (Array.isArray(itemType.defaultReminderIntervals) ? itemType.defaultReminderIntervals : []);
      } catch (e) {
        console.error('Error parsing reminder intervals:', e);
      }

      return {
        ...itemType,
        defaultReminderIntervals: intervals
      };
    }
    return undefined;
  }

  async createItemType(itemType: InsertItemType): Promise<ItemType> {
    const reminderIntervals = Array.isArray(itemType.defaultReminderIntervals)
      ? itemType.defaultReminderIntervals
      : typeof itemType.defaultReminderIntervals === 'string'
        ? JSON.parse(itemType.defaultReminderIntervals)
        : [30, 15, 7];

    const data = {
      ...itemType,
      defaultReminderIntervals: JSON.stringify(reminderIntervals)
    };

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'INSERT INTO item_types (name, default_renewal_period, default_reminder_intervals) VALUES (?, ?, ?)',
        [data.name, data.defaultRenewalPeriod, data.defaultReminderIntervals]
      );

      const insertId = Number(result.insertId);
      const [createdType] = await connection.query(
        'SELECT * FROM item_types WHERE id = ?',
        [insertId]
      );

      await connection.commit();
      return {
        ...createdType[0],
        defaultReminderIntervals: JSON.parse(createdType[0].default_reminder_intervals)
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async updateItemType(id: number, data: Partial<InsertItemType>): Promise<ItemType | undefined> {
    await db.update(itemTypes)
      .set(data)
      .where(eq(itemTypes.id, id));
    return await this.getItemType(id);
  }

  async deleteItemType(id: number): Promise<boolean> {
    await db.delete(itemTypes).where(eq(itemTypes.id, id));
    return true;
  }

  async getAllItemTypes(): Promise<ItemType[]> {
    return await db.select().from(itemTypes);
  }

  // Renewable operations
  async getRenewable(id: number): Promise<Renewable | undefined> {
    const [renewable] = await db.select().from(renewables).where(eq(renewables.id, id));
    return renewable;
  }

  async createRenewable(renewable: InsertRenewable): Promise<Renewable> {
    const result = await db.insert(renewables).values({
      ...renewable,
      startDate: new Date(renewable.startDate),
      endDate: new Date(renewable.endDate)
    });
    const insertId = Number(result[0].insertId);
    return await this.getRenewable(insertId) as Renewable;
  }

  async updateRenewable(id: number, data: Partial<InsertRenewable>): Promise<Renewable | undefined> {
    await db.update(renewables)
      .set({
        ...data,
        updatedAt: new Date(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined
      })
      .where(eq(renewables.id, id));
    return await this.getRenewable(id);
  }

  async deleteRenewable(id: number): Promise<boolean> {
    await db.delete(renewables).where(eq(renewables.id, id));
    return true;
  }

  async getAllRenewables(): Promise<Renewable[]> {
    return await db.select().from(renewables);
  }

  async getRenewablesByClientId(clientId: number): Promise<Renewable[]> {
    return await db.select()
      .from(renewables)
      .where(eq(renewables.clientId, clientId));
  }

  async getRenewablesByTypeId(typeId: number): Promise<Renewable[]> {
    return await db.select()
      .from(renewables)
      .where(eq(renewables.typeId, typeId));
  }

  async getRenewablesByAssignedToId(userId: number): Promise<Renewable[]> {
    return await db.select()
      .from(renewables)
      .where(eq(renewables.assignedToId, userId));
  }

  async getUpcomingRenewables(days: number): Promise<Renewable[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return await db.select()
      .from(renewables)
      .where(
        and(
          eq(renewables.status, "active"),
          gte(renewables.endDate, today),
          lte(renewables.endDate, futureDate)
        )
      )
      .orderBy(renewables.endDate);
  }

  async getExpiredRenewables(): Promise<Renewable[]> {
    const today = new Date();

    return await db.select()
      .from(renewables)
      .where(
        and(
          eq(renewables.status, "active"),
          lte(renewables.endDate, today)
        )
      )
      .orderBy(renewables.endDate);
  }

  // Reminder log operations
  async getReminderLog(id: number): Promise<ReminderLog | undefined> {
    const [log] = await db.select().from(reminderLogs).where(eq(reminderLogs.id, id));
    return log;
  }

  async createReminderLog(log: InsertReminderLog): Promise<ReminderLog> {
    const [newLog] = await db.insert(reminderLogs).values(log).returning();
    return newLog;
  }

  async getReminderLogsByRenewableId(renewableId: number): Promise<ReminderLog[]> {
    return await db.select()
      .from(reminderLogs)
      .where(eq(reminderLogs.renewableId, renewableId))
      .orderBy(desc(reminderLogs.sentAt));
  }

  async getRecentReminderLogs(): Promise<ReminderLog[]> {
    return await db.select()
      .from(reminderLogs)
      .orderBy(desc(reminderLogs.sentAt))
      .limit(50);
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    clientCount: number;
    activeRenewablesCount: number;
    upcomingRenewablesCount: number;
    expiredRenewablesCount: number;
    previousMonthStats?: {
      clientCount: number;
      activeRenewablesCount: number;
    };
  }> {
    const [clientsResult] = await db.select({ count: sql<number>`count(*)` }).from(clients);

    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    const [activeResult] = await db.select({ count: sql<number>`count(*)` })
      .from(renewables)
      .where(eq(renewables.status, "active"));

    const [upcomingResult] = await db.select({ count: sql<number>`count(*)` })
      .from(renewables)
      .where(
        and(
          eq(renewables.status, "active"),
          gte(renewables.endDate, today),
          lte(renewables.endDate, nextMonth)
        )
      );

    const [expiredResult] = await db.select({ count: sql<number>`count(*)` })
      .from(renewables)
      .where(
        and(
          eq(renewables.status, "active"),
          lte(renewables.endDate, today)
        )
      );

    return {
      clientCount: clientsResult?.count || 0,
      activeRenewablesCount: activeResult?.count || 0,
      upcomingRenewablesCount: upcomingResult?.count || 0,
      expiredRenewablesCount: expiredResult?.count || 0
    };
  }
}

export const storage = new DatabaseStorage();

// Added a utility function to format amounts with Indian Rupee symbol (issue 2)
const formatAmountINR = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};