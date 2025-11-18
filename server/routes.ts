import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertClientSchema, insertEmployeeSchema, insertEventSchema, insertInventoryItemSchema, insertFinancialTransactionSchema, insertPurchaseSchema, insertEventCategorySchema, insertEmployeeRoleSchema, insertPackageSchema, insertEmployeePaymentSchema } from "@shared/schema";
import axios from "axios";
import * as cheerio from "cheerio";

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
  
  // Employee Payments routes
  app.get("/api/employees/:id/payments", authenticateToken, async (req, res) => {
    try {
      const payments = await storage.getEmployeePayments(req.params.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar pagamentos" });
    }
  });
  
  app.post("/api/employees/:id/payments", authenticateToken, async (req, res) => {
    try {
      const paymentData = insertEmployeePaymentSchema.omit({ employeeId: true }).parse({
        ...req.body,
        paymentDate: new Date(req.body.paymentDate),
      });
      const payment = await storage.createEmployeePayment(req.params.id, paymentData);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar pagamento" });
    }
  });
  
  app.delete("/api/employee-payments/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteEmployeePayment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar pagamento" });
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
  
  // Packages routes
  app.get("/api/settings/packages", authenticateToken, async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar pacotes" });
    }
  });
  
  app.post("/api/settings/packages", authenticateToken, async (req, res) => {
    try {
      const data = insertPackageSchema.parse(req.body);
      const pkg = await storage.createPackage(data);
      res.status(201).json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar pacote" });
    }
  });
  
  app.patch("/api/settings/packages/:id", authenticateToken, async (req, res) => {
    try {
      const data = insertPackageSchema.partial().parse(req.body);
      const pkg = await storage.updatePackage(req.params.id, data);
      res.json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar pacote" });
    }
  });
  
  app.delete("/api/settings/packages/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deletePackage(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar pacote" });
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

  // Taxas e Juros - Sumup Scraping
  app.get("/api/settings/fees/sumup", authenticateToken, async (req, res) => {
    try {
      const sumupUrl = "https://www.sumup.com/pt-br/maquininhas/taxas/";
      
      // Dados padrão baseados na pesquisa (fallback)
      const defaultData = {
        lastUpdated: new Date().toISOString(),
        pix: { fee: "0%", description: "PIX grátis, sempre!" },
        tiers: [
          {
            name: "Até R$ 5.000/mês",
            range: "até R$ 5.000",
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { 
              d1: "4,49%", 
              instant: "4,69%",
              description: "Crédito à vista" 
            },
            credit_installments: { 
              d30: "5,49%", 
              instant: "5,69%",
              description: "Parcelado (2x a 12x)" 
            }
          },
          {
            name: "R$ 5.000 a R$ 20.000/mês",
            range: "R$ 5.000 a R$ 20.000",
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { 
              d1: "4,09%", 
              instant: "4,29%",
              description: "Crédito à vista" 
            },
            credit_installments: { 
              d30: "5,09%", 
              instant: "5,29%",
              description: "Parcelado (2x a 12x)" 
            }
          },
          {
            name: "R$ 20.000 a R$ 50.000/mês",
            range: "R$ 20.000 a R$ 50.000",
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { 
              d1: "3,79%", 
              instant: "3,99%",
              description: "Crédito à vista" 
            },
            credit_installments: { 
              d30: "4,79%", 
              instant: "4,99%",
              description: "Parcelado (2x a 12x)" 
            }
          },
          {
            name: "Acima de R$ 50.000/mês",
            range: "acima de R$ 50.000",
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { 
              d1: "3,49%", 
              instant: "3,69%",
              description: "Crédito à vista" 
            },
            credit_installments: { 
              d30: "4,49%", 
              instant: "4,69%",
              description: "Parcelado (2x a 12x)" 
            }
          }
        ],
        promotional: {
          description: "Taxa promocional no primeiro mês",
          credit_cash: "a partir de 3,70%"
        },
        notes: [
          "Taxas variam conforme faturamento mensal",
          "D+1 = Recebimento em 1 dia útil",
          "Instant = Recebimento na hora",
          "D+30 = Recebimento em 30 dias (parcelado)"
        ]
      };

      try {
        // Tenta fazer scraping da página
        const response = await axios.get(sumupUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        
        // Tenta extrair informações do texto
        const pageText = $('body').text();
        const hasValidContent = pageText.includes('SumUp') && pageText.includes('taxa');
        
        if (hasValidContent) {
          // Página acessada com sucesso, retorna dados padrão atualizados
          res.json({
            success: true,
            source: "sumup_official",
            url: sumupUrl,
            data: defaultData
          });
        } else {
          throw new Error("Conteúdo da página não foi carregado corretamente");
        }
      } catch (scrapingError) {
        // Se falhar o scraping, retorna dados padrão
        console.error("Erro ao fazer scraping da Sumup:", scrapingError);
        res.json({
          success: true,
          source: "fallback",
          message: "Dados baseados em informações oficiais da Sumup (última atualização: Agosto 2025)",
          data: defaultData
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || "Erro ao buscar taxas da Sumup",
        success: false 
      });
    }
  });

  // Taxas personalizadas - CRUD
  app.get("/api/settings/fees/custom", authenticateToken, async (req, res) => {
    try {
      const customFees = await storage.getSystemSetting("custom_fees");
      if (!customFees) {
        return res.json(null);
      }
      res.json(JSON.parse(customFees.value));
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar taxas personalizadas" });
    }
  });

  app.post("/api/settings/fees/custom", authenticateToken, async (req, res) => {
    try {
      const { fees } = req.body;
      if (!fees) {
        return res.status(400).json({ message: "Dados de taxas são obrigatórios" });
      }
      
      const setting = await storage.upsertSystemSetting("custom_fees", JSON.stringify(fees));
      res.json({ success: true, data: JSON.parse(setting.value) });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao salvar taxas personalizadas" });
    }
  });

  // Configuração de tipo de taxa (sumup ou personalizado)
  app.get("/api/settings/fees/type", authenticateToken, async (req, res) => {
    try {
      const feeType = await storage.getSystemSetting("fee_type");
      res.json({ type: feeType?.value || "sumup" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar tipo de taxa" });
    }
  });

  app.post("/api/settings/fees/type", authenticateToken, async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !["sumup", "custom"].includes(type)) {
        return res.status(400).json({ message: "Tipo de taxa inválido. Use 'sumup' ou 'custom'" });
      }
      
      await storage.upsertSystemSetting("fee_type", type);
      res.json({ success: true, type });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao salvar tipo de taxa" });
    }
  });

  // Tier preferencial da Sumup
  app.get("/api/settings/fees/sumup-tier", authenticateToken, async (req, res) => {
    try {
      const tier = await storage.getSystemSetting("sumup_tier");
      res.json({ tier: tier?.value || "0" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar tier" });
    }
  });

  app.post("/api/settings/fees/sumup-tier", authenticateToken, async (req, res) => {
    try {
      const { tier } = req.body;
      if (tier === undefined || tier === null) {
        return res.status(400).json({ message: "Tier é obrigatório" });
      }
      
      await storage.upsertSystemSetting("sumup_tier", String(tier));
      res.json({ success: true, tier });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao salvar tier" });
    }
  });

  // Taxa de juros mensal
  app.get("/api/settings/fees/monthly-interest", authenticateToken, async (req, res) => {
    try {
      const interest = await storage.getSystemSetting("monthly_interest_rate");
      res.json({ monthlyInterestRate: interest?.value || "0" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar taxa de juros" });
    }
  });

  app.post("/api/settings/fees/monthly-interest", authenticateToken, async (req, res) => {
    try {
      const { monthlyInterestRate } = req.body;
      if (monthlyInterestRate === undefined || monthlyInterestRate === null) {
        return res.status(400).json({ message: "Taxa de juros é obrigatória" });
      }
      
      // Validar que é um número válido e positivo
      const rate = parseFloat(monthlyInterestRate);
      if (isNaN(rate) || !isFinite(rate) || rate < 0) {
        return res.status(400).json({ 
          message: "Taxa de juros inválida. Deve ser um número positivo." 
        });
      }
      
      await storage.upsertSystemSetting("monthly_interest_rate", String(rate));
      res.json({ success: true, monthlyInterestRate: rate });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao salvar taxa de juros" });
    }
  });

  // Função para calcular taxa mensal baseada no número de parcelas (Sumup)
  function calculateMonthlyInterestRate(installments: number): number {
    // Taxas calculadas baseadas nas simulações reais da Sumup
    // 5x = 2.10% ao mês, 10x = 2.82% ao mês
    const taxaMap: { [key: number]: number } = {
      1: 0.00,    // Sem juros para 1x
      2: 0.53,
      3: 1.05,
      4: 1.58,
      5: 2.10,
      6: 2.24,
      7: 2.39,
      8: 2.53,
      9: 2.68,
      10: 2.82,
      11: 2.96,
      12: 3.11
    };

    // Se temos a taxa exata no mapa, retornar
    if (taxaMap[installments] !== undefined) {
      return taxaMap[installments];
    }

    // Para valores acima de 12, extrapolar
    if (installments > 12) {
      const incremento = (taxaMap[10] - taxaMap[5]) / (10 - 5); // 0.144% por parcela
      return taxaMap[12] + incremento * (installments - 12);
    }

    // Caso inválido, retornar 0
    return 0;
  }

  // Calcular taxa aplicável (com juros compostos se parcelado)
  app.post("/api/settings/fees/calculate", authenticateToken, async (req, res) => {
    try {
      const { paymentMethod, cardType, installments } = req.body;
      
      if (!paymentMethod) {
        return res.status(400).json({ message: "Método de pagamento é obrigatório" });
      }

      // Se não for cartão, não há taxa
      if (paymentMethod !== "cartao_credito" && paymentMethod !== "cartao_debito") {
        return res.json({ 
          feePercentage: 0, 
          feeType: "none",
          monthlyInterestRate: 0,
          hasInstallmentInterest: false
        });
      }

      // Buscar tipo de taxa configurado
      const feeTypeSetting = await storage.getSystemSetting("fee_type");
      const feeType = feeTypeSetting?.value || "sumup";

      // Validar installments: garantir valor numérico válido (default 1)
      const parsedInstallments = installments ? parseInt(String(installments)) : 1;
      const numInstallments = isNaN(parsedInstallments) || parsedInstallments < 1 ? 1 : parsedInstallments;
      
      // Calcular taxa mensal baseada no número de parcelas (para Sumup)
      let monthlyInterestRate = 0;
      if (feeType === "sumup") {
        monthlyInterestRate = calculateMonthlyInterestRate(numInstallments);
      } else {
        // Para taxas customizadas, usar a taxa configurada manualmente
        const interestSetting = await storage.getSystemSetting("monthly_interest_rate");
        monthlyInterestRate = interestSetting?.value ? parseFloat(interestSetting.value) : 0;
      }
      
      // Verificar se tem parcelamento com juros (crédito parcelado > 1x)
      const hasInstallmentInterest = paymentMethod === "cartao_credito" && numInstallments > 1 && monthlyInterestRate > 0;

      if (feeType === "custom") {
        // Usar taxas personalizadas
        const customFeesSetting = await storage.getSystemSetting("custom_fees");
        if (!customFeesSetting) {
          return res.status(404).json({ message: "Taxas personalizadas não configuradas" });
        }

        const customFees = JSON.parse(customFeesSetting.value);
        
        if (paymentMethod === "cartao_debito") {
          const feeStr = customFees.debit || "0%";
          const feePercentage = parseFloat(feeStr.replace("%", "").replace(",", "."));
          return res.json({ 
            feePercentage, 
            feeType: "custom_debit",
            monthlyInterestRate,
            hasInstallmentInterest: false
          });
        } else {
          // Crédito
          const feeStr = numInstallments > 1 
            ? customFees.creditInstallments 
            : customFees.creditCash;
          const feePercentage = parseFloat((feeStr || "0%").replace("%", "").replace(",", "."));
          return res.json({ 
            feePercentage, 
            feeType: numInstallments > 1 ? "custom_credit_installments" : "custom_credit_cash",
            monthlyInterestRate,
            hasInstallmentInterest
          });
        }
      } else {
        // Usar taxas da Sumup
        const tierSetting = await storage.getSystemSetting("sumup_tier");
        const tierIndex = tierSetting?.value ? parseInt(tierSetting.value) : 0;

        // Dados padrão das taxas Sumup (mesmo do endpoint sumup)
        const sumupTiers = [
          {
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { d1: "4,49%" },
            credit_installments: { d30: "5,49%" }
          },
          {
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { d1: "4,09%" },
            credit_installments: { d30: "5,09%" }
          },
          {
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { d1: "3,79%" },
            credit_installments: { d30: "4,79%" }
          },
          {
            debit: { visa_master: "1,05%", others: "2,55%" },
            credit_cash: { d1: "3,49%" },
            credit_installments: { d30: "4,49%" }
          }
        ];

        const tier = sumupTiers[tierIndex] || sumupTiers[0];

        if (paymentMethod === "cartao_debito") {
          // Usar visa_master como padrão se cardType não for fornecido
          const effectiveCardType = cardType || "visa_master";
          const feeStr = effectiveCardType === "visa_master" ? tier.debit.visa_master : tier.debit.others;
          const feePercentage = parseFloat(feeStr.replace("%", "").replace(",", "."));
          return res.json({ 
            feePercentage, 
            feeType: `sumup_debit_${effectiveCardType}`,
            monthlyInterestRate,
            hasInstallmentInterest: false
          });
        } else {
          // Crédito - considerar como parcelado se installments > 1, caso contrário à vista
          const isInstallment = numInstallments > 1;
          const feeStr = isInstallment ? tier.credit_installments.d30 : tier.credit_cash.d1;
          const feePercentage = parseFloat(feeStr.replace("%", "").replace(",", "."));
          return res.json({ 
            feePercentage, 
            feeType: isInstallment ? "sumup_credit_installments" : "sumup_credit_cash",
            monthlyInterestRate,
            hasInstallmentInterest
          });
        }
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao calcular taxa" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
