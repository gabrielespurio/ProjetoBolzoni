import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertClientSchema, insertEmployeeSchema, insertEventSchema, insertInventoryItemSchema, insertFinancialTransactionSchema, insertPurchaseSchema, insertEventCategorySchema, insertEmployeeRoleSchema } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "bolzoni-secret-key-2024";

// JWT authentication middleware
interface AuthRequest extends Request {
  userId?: string;
}

async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Token de autenticação não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar usuário" });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao fazer login" });
    }
  });
  
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar usuário" });
    }
  });
  
  // Clients routes
  app.get("/api/clients", authenticateToken, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar clientes" });
    }
  });
  
  app.get("/api/clients/:id", authenticateToken, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar cliente" });
    }
  });
  
  app.post("/api/clients", authenticateToken, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar cliente" });
    }
  });
  
  app.patch("/api/clients/:id", authenticateToken, async (req, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar cliente" });
    }
  });
  
  app.delete("/api/clients/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar cliente" });
    }
  });
  
  // Employees routes
  app.get("/api/employees", authenticateToken, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar funcionários" });
    }
  });
  
  app.post("/api/employees", authenticateToken, async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar funcionário" });
    }
  });
  
  app.patch("/api/employees/:id", authenticateToken, async (req, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, data);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar funcionário" });
    }
  });
  
  app.delete("/api/employees/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar funcionário" });
    }
  });
  
  // Events routes
  app.get("/api/events", authenticateToken, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar eventos" });
    }
  });
  
  app.post("/api/events", authenticateToken, async (req, res) => {
    try {
      const { characterIds, expenses, eventEmployees, ...eventData } = req.body;
      const parsedData = insertEventSchema.parse({
        ...eventData,
        date: new Date(eventData.date),
      });
      const event = await storage.createEvent(parsedData, characterIds, expenses, eventEmployees);
      res.status(201).json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar evento" });
    }
  });
  
  app.patch("/api/events/:id", authenticateToken, async (req, res) => {
    try {
      const { characterIds, expenses, eventEmployees, ...eventData } = req.body;
      const bodyData = { ...eventData };
      if (bodyData.date) {
        bodyData.date = new Date(bodyData.date);
      }
      const data = insertEventSchema.partial().parse(bodyData);
      const event = await storage.updateEvent(req.params.id, data, characterIds, expenses, eventEmployees);
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar evento" });
    }
  });
  
  app.delete("/api/events/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar evento" });
    }
  });
  
  // Inventory routes
  app.get("/api/inventory", authenticateToken, async (req, res) => {
    try {
      const items = await storage.getAllInventoryItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar itens" });
    }
  });
  
  app.post("/api/inventory", authenticateToken, async (req, res) => {
    try {
      const data = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar item" });
    }
  });
  
  app.patch("/api/inventory/:id", authenticateToken, async (req, res) => {
    try {
      const data = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar item" });
    }
  });
  
  app.delete("/api/inventory/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteInventoryItem(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar item" });
    }
  });
  
  // Financial transactions routes
  app.get("/api/financial/transactions", authenticateToken, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar transações" });
    }
  });
  
  app.post("/api/financial/transactions", authenticateToken, async (req, res) => {
    try {
      const bodyData = { ...req.body };
      if (bodyData.dueDate) bodyData.dueDate = new Date(bodyData.dueDate);
      if (bodyData.paidDate) bodyData.paidDate = new Date(bodyData.paidDate);
      const data = insertFinancialTransactionSchema.parse(bodyData);
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar transação" });
    }
  });
  
  app.patch("/api/financial/transactions/:id", authenticateToken, async (req, res) => {
    try {
      const bodyData = { ...req.body };
      if (bodyData.dueDate) bodyData.dueDate = new Date(bodyData.dueDate);
      if (bodyData.paidDate) bodyData.paidDate = new Date(bodyData.paidDate);
      const data = insertFinancialTransactionSchema.partial().parse(bodyData);
      const transaction = await storage.updateTransaction(req.params.id, data);
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar transação" });
    }
  });
  
  app.delete("/api/financial/transactions/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteTransaction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar transação" });
    }
  });
  
  // Purchases routes
  app.get("/api/purchases", authenticateToken, async (req, res) => {
    try {
      const purchases = await storage.getAllPurchases();
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar compras" });
    }
  });
  
  app.post("/api/purchases", authenticateToken, async (req, res) => {
    try {
      const bodyData = { ...req.body };
      if (bodyData.purchaseDate) bodyData.purchaseDate = new Date(bodyData.purchaseDate);
      const data = insertPurchaseSchema.parse(bodyData);
      const purchase = await storage.createPurchase(data);
      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar compra" });
    }
  });
  
  app.patch("/api/purchases/:id", authenticateToken, async (req, res) => {
    try {
      const bodyData = { ...req.body };
      if (bodyData.purchaseDate) bodyData.purchaseDate = new Date(bodyData.purchaseDate);
      const data = insertPurchaseSchema.partial().parse(bodyData);
      const purchase = await storage.updatePurchase(req.params.id, data);
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar compra" });
    }
  });
  
  app.delete("/api/purchases/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deletePurchase(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar compra" });
    }
  });
  
  // Dashboard routes
  app.get("/api/dashboard/metrics", authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar métricas" });
    }
  });
  
  app.get("/api/dashboard/upcoming-events", authenticateToken, async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents(5);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar eventos" });
    }
  });
  
  // Event Categories routes
  app.get("/api/settings/event-categories", authenticateToken, async (req, res) => {
    try {
      const categories = await storage.getAllEventCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar categorias" });
    }
  });
  
  app.post("/api/settings/event-categories", authenticateToken, async (req, res) => {
    try {
      const data = insertEventCategorySchema.parse(req.body);
      const category = await storage.createEventCategory(data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar categoria" });
    }
  });
  
  app.patch("/api/settings/event-categories/:id", authenticateToken, async (req, res) => {
    try {
      const data = insertEventCategorySchema.partial().parse(req.body);
      const category = await storage.updateEventCategory(req.params.id, data);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar categoria" });
    }
  });
  
  app.delete("/api/settings/event-categories/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteEventCategory(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar categoria" });
    }
  });
  
  // Employee Roles routes
  app.get("/api/settings/employee-roles", authenticateToken, async (req, res) => {
    try {
      const roles = await storage.getAllEmployeeRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar funções" });
    }
  });
  
  app.post("/api/settings/employee-roles", authenticateToken, async (req, res) => {
    try {
      const data = insertEmployeeRoleSchema.parse(req.body);
      const role = await storage.createEmployeeRole(data);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar função" });
    }
  });
  
  app.patch("/api/settings/employee-roles/:id", authenticateToken, async (req, res) => {
    try {
      const data = insertEmployeeRoleSchema.partial().parse(req.body);
      const role = await storage.updateEmployeeRole(req.params.id, data);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar função" });
    }
  });
  
  app.delete("/api/settings/employee-roles/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteEmployeeRole(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar função" });
    }
  });
  
  // System Settings
  app.get("/api/settings/system", authenticateToken, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar configurações" });
    }
  });
  
  app.get("/api/settings/system/:key", authenticateToken, async (req, res) => {
    try {
      const setting = await storage.getSystemSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar configuração" });
    }
  });
  
  app.post("/api/settings/system", authenticateToken, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || !value) {
        return res.status(400).json({ message: "Key e value são obrigatórios" });
      }
      const setting = await storage.upsertSystemSetting(key, value);
      res.json(setting);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao salvar configuração" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
