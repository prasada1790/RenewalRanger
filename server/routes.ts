import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertClientSchema,
  insertItemTypeSchema,
  insertRenewableSchema
} from "@shared/schema";
import { setupReminderCron, triggerReminders } from "./reminders";

// Helper for handling async routes with error handling
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => 
  (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch(err => {
      console.error('Route error:', err);

      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }

      res.status(500).json({ message: err.message || 'Internal server error' });
    });
  };

// Check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

// Check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden - Admin access required' });
};

export function registerRoutes(app: Express): Server {
  // Authentication routes (handled in auth.ts)
  setupAuth(app);

  // Setup reminder cron job
  setupReminderCron();

  // Clients API
  app.get('/api/clients', isAuthenticated, asyncHandler(async (req, res) => {
    const clients = await storage.getAllClients();
    res.json(clients);
  }));

  app.get('/api/clients/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const client = await storage.getClient(id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  }));

  app.post('/api/clients', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertClientSchema.parse(req.body);
    const client = await storage.createClient(data);
    res.status(201).json(client);
  }));

  app.put('/api/clients/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const data = insertClientSchema.partial().parse(req.body);

    const updatedClient = await storage.updateClient(id, data);

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(updatedClient);
  }));

  app.delete('/api/clients/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteClient(id);
    res.status(204).send();
  }));

  // Item Types API (admin only)
  app.get('/api/item-types', isAuthenticated, asyncHandler(async (req, res) => {
    const types = await storage.getAllItemTypes();
    res.json(types);
  }));

  app.get('/api/item-types/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const itemType = await storage.getItemType(id);

    if (!itemType) {
      return res.status(404).json({ message: 'Item type not found' });
    }

    res.json(itemType);
  }));

  app.post('/api/item-types', isAdmin, asyncHandler(async (req, res) => {
    const data = insertItemTypeSchema.parse(req.body);
    const itemType = await storage.createItemType(data);
    res.status(201).json(itemType);
  }));

  app.put('/api/item-types/:id', isAdmin, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const data = insertItemTypeSchema.partial().parse(req.body);

    const updatedItemType = await storage.updateItemType(id, data);

    if (!updatedItemType) {
      return res.status(404).json({ message: 'Item type not found' });
    }

    res.json(updatedItemType);
  }));

  app.delete('/api/item-types/:id', isAdmin, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);

    // Check if any renewables use this item type
    const renewables = await storage.getRenewablesByTypeId(id);
    if (renewables.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete item type as it is in use by renewable items' 
      });
    }

    await storage.deleteItemType(id);
    res.status(204).send();
  }));

  // Renewables API
  app.get('/api/renewables', isAuthenticated, asyncHandler(async (req, res) => {
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    const typeId = req.query.typeId ? parseInt(req.query.typeId as string) : undefined;
    const assignedToId = req.query.assignedToId ? parseInt(req.query.assignedToId as string) : undefined;

    let renewables;

    if (clientId) {
      renewables = await storage.getRenewablesByClientId(clientId);
    } else if (typeId) {
      renewables = await storage.getRenewablesByTypeId(typeId);
    } else if (assignedToId) {
      renewables = await storage.getRenewablesByAssignedToId(assignedToId);
    } else {
      renewables = await storage.getAllRenewables();
    }

    res.json(renewables);
  }));

  app.get('/api/renewables/upcoming/:days', isAuthenticated, asyncHandler(async (req, res) => {
    const days = parseInt(req.params.days || '30');
    const renewables = await storage.getUpcomingRenewables(days);
    res.json(renewables);
  }));

  app.get('/api/renewables/expired', isAuthenticated, asyncHandler(async (req, res) => {
    const renewables = await storage.getExpiredRenewables();
    res.json(renewables);
  }));

  app.get('/api/renewables/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const renewable = await storage.getRenewable(id);

    if (!renewable) {
      return res.status(404).json({ message: 'Renewable item not found' });
    }

    res.json(renewable);
  }));

  app.post('/api/renewables', isAuthenticated, asyncHandler(async (req, res) => {
    const data = insertRenewableSchema.parse(req.body);
    const renewable = await storage.createRenewable(data);
    res.status(201).json(renewable);
  }));

  app.put('/api/renewables/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const data = insertRenewableSchema.partial().parse(req.body);

    const updatedRenewable = await storage.updateRenewable(id, data);

    if (!updatedRenewable) {
      return res.status(404).json({ message: 'Renewable item not found' });
    }

    res.json(updatedRenewable);
  }));

  app.delete('/api/renewables/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteRenewable(id);
    res.status(204).send();
  }));

  // Users API (admin only)
  app.get('/api/users', isAdmin, asyncHandler(async (req, res) => {
    const users = await storage.getAllUsers();
    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(sanitizedUsers);
  }));

  app.put('/api/users/profile', isAuthenticated, asyncHandler(async (req, res) => {
    const data = profileFormSchema.parse(req.body);
    const updatedUser = await storage.updateUser(req.user.id, data);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  }));

  app.put('/api/admin/users/:id', isAdmin, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const data = insertUserSchema.partial().parse(req.body);
    const updatedUser = await storage.updateUser(id, data);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  }));

  app.delete('/api/admin/users/:id', isAdmin, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteUser(id);
    res.status(200).send();
  }));


  // Reminder logs API
  app.get('/api/reminder-logs', isAuthenticated, asyncHandler(async (req, res) => {
    const renewableId = req.query.renewableId ? parseInt(req.query.renewableId as string) : null;
    const logs = renewableId 
      ? await storage.getReminderLogsByRenewableId(renewableId)
      : await storage.getAllReminderLogs();
    res.json(logs);
  }));

  app.get('/api/reminder-logs/recent', isAuthenticated, asyncHandler(async (req, res) => {
    const logs = await storage.getRecentReminderLogs();
    res.json(logs);
  }));

  // Trigger reminders manually (admin only)
  app.post('/api/admin/trigger-reminders', isAdmin, asyncHandler(async (req, res) => {
    await triggerReminders();
    res.json({ message: 'Reminders triggered successfully' });
  }));

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, asyncHandler(async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  }));

  const httpServer = createServer(app);

  return httpServer;
}