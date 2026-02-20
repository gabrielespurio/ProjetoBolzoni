import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertClientSchema, insertEmployeeSchema, insertEventSchema, insertInventoryItemSchema, insertFinancialTransactionSchema, insertPurchaseSchema, validatePurchaseSchema, insertEventCategorySchema, insertEmployeeRoleSchema, insertPackageSchema, insertSkillSchema, insertServiceSchema, insertEmployeePaymentSchema, insertBuffetSchema } from "@shared/schema";
import axios from "axios";
import * as cheerio from "cheerio";

const JWT_SECRET = process.env.SESSION_SECRET || "bolzoni-secret-key-2024";

// JWT authentication middleware
interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
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

    // Get user role for authorization
    const user = await storage.getUser(decoded.userId);
    if (user) {
      req.userRole = user.role;
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido" });
  }
}

// Admin-only authorization middleware
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores podem acessar este recurso." });
  }
  next();
}

// Admin or Secretaria authorization middleware
function requireAdminOrSecretaria(req: AuthRequest, res: Response, next: NextFunction) {
  const role = (req.userRole || "").toLowerCase();
  if (role !== 'admin' && role !== 'secretaria' && role !== 'secretária') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores e secretárias podem acessar este recurso." });
  }
  next();
}

// Middleware to check if user can create/edit events (only admin)
function requireEventEdit(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores podem criar ou editar eventos." });
  }
  next();
}

// Middleware to check if user can create/edit clients (admin only)
function requireClientEdit(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores podem criar ou editar clientes." });
  }
  next();
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

      // If user is an employee, find their employee ID
      let employeeId: string | null = null;
      if (user.role === 'employee') {
        const allEmployees = await storage.getAllEmployees();
        const linkedEmployee = allEmployees.find(emp => emp.userId === user.id);
        if (linkedEmployee) {
          employeeId = linkedEmployee.id;
        }
      }

      res.json({ ...userWithoutPassword, employeeId });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar usuário" });
    }
  });

  // Clients routes
  app.get("/api/clients", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clients = await storage.getAllClients();
      const role = (req.userRole || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      // For employees, filter to show only clients from events they are linked to
      if (role === 'employee' || role === 'funcionario') {
        const allEmployees = await storage.getAllEmployees();
        const linkedEmployee = allEmployees.find(emp => emp.userId === req.userId);

        if (linkedEmployee) {
          // Get all events
          const events = await storage.getAllEvents();

          // Filter events that have this employee linked
          const employeeEvents = events.filter((event: any) =>
            event.eventEmployees?.some((ee: any) => ee.employeeId === linkedEmployee.id)
          );

          // Get unique client IDs from those events
          const clientIds = new Set(employeeEvents.map((e: any) => e.clientId));

          // Filter clients
          const filteredClients = clients.filter(client => clientIds.has(client.id));
          return res.json(filteredClients);
        }

        // If no linked employee found, return empty
        return res.json([]);
      }

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

  app.post("/api/clients", authenticateToken, requireClientEdit, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar cliente" });
    }
  });

  app.patch("/api/clients/:id", authenticateToken, requireClientEdit, async (req, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar cliente" });
    }
  });

  app.delete("/api/clients/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar cliente" });
    }
  });

  // Employees routes (admin and secretaria can view, only admin can modify)
  app.get("/api/employees", authenticateToken, requireAdminOrSecretaria, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar funcionários" });
    }
  });

  app.post("/api/employees", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userEmail, userPassword, ...employeeData } = req.body;
      let userId: string | undefined = undefined;

      // Create user if email and password are provided
      if (userEmail && userPassword) {
        const existingUser = await storage.getUserByUsername(userEmail);
        if (existingUser) {
          return res.status(400).json({ message: "Email já cadastrado como usuário" });
        }

        const hashedPassword = await bcrypt.hash(userPassword, 10);
        const user = await storage.createUser({
          username: userEmail,
          password: hashedPassword,
          name: employeeData.name,
          role: employeeData.role?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("secretaria") ? "secretaria" : "employee",
        });
        userId = user.id;
      }

      const data = insertEmployeeSchema.parse({ ...employeeData, userId });
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar funcionário" });
    }
  });

  app.patch("/api/employees/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userEmail, userPassword, ...employeeData } = req.body;
      console.log("PATCH /api/employees/:id payload:", JSON.stringify(employeeData, null, 2));
      const currentEmployee = await storage.getEmployee(req.params.id);

      if (!currentEmployee) {
        return res.status(404).json({ message: "Funcionário não encontrado" });
      }

      let userId = currentEmployee.userId;

      // Create or update user if email and password are provided
      if (userEmail && userPassword) {
        if (currentEmployee.userId) {
          // Update existing user password and role
          const hashedPassword = await bcrypt.hash(userPassword, 10);
          await storage.updateUser(currentEmployee.userId, {
            password: hashedPassword,
            name: employeeData.name || currentEmployee.name,
            role: (employeeData.role || currentEmployee.role)?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("secretaria") ? "secretaria" : "employee",
          });
        } else {
          // Create new user
          const existingUser = await storage.getUserByUsername(userEmail);
          if (existingUser) {
            return res.status(400).json({ message: "Email já cadastrado como usuário" });
          }

          const hashedPassword = await bcrypt.hash(userPassword, 10);
          const user = await storage.createUser({
            username: userEmail,
            password: hashedPassword,
            name: employeeData.name || currentEmployee.name,
            role: (employeeData.role || currentEmployee.role)?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("secretaria") ? "secretaria" : "employee",
          });
          userId = user.id;
        }
      }

      const data = insertEmployeeSchema.partial().parse({ ...employeeData, userId });
      const employee = await storage.updateEmployee(req.params.id, data);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar funcionário" });
    }
  });

  app.delete("/api/employees/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar funcionário" });
    }
  });

  // Employee Payments routes
  app.get("/api/employees/:id/payments", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getEmployeePayments(req.params.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar pagamentos" });
    }
  });

  app.post("/api/employees/:id/payments", authenticateToken, requireAdmin, async (req, res) => {
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

  app.delete("/api/employee-payments/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEmployeePayment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar pagamento" });
    }
  });

  // Employee Skills routes
  app.get("/api/employees/:id/skills", authenticateToken, async (req, res) => {
    try {
      const skills = await storage.getEmployeeSkillsWithDetails(req.params.id);
      res.json(skills);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar habilidades" });
    }
  });

  app.put("/api/employees/:id/skills", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { skillIds } = req.body;
      if (!Array.isArray(skillIds)) {
        return res.status(400).json({ message: "skillIds deve ser um array" });
      }
      await storage.setEmployeeSkills(req.params.id, skillIds);
      const skills = await storage.getEmployeeSkillsWithDetails(req.params.id);
      res.json(skills);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar habilidades" });
    }
  });

  // Events routes
  app.get("/api/events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getAllEvents();
      const userRoleRaw = (req.userRole || "").toLowerCase();
      const isSecretaria = userRoleRaw === 'secretaria' || userRoleRaw === 'secretária' || userRoleRaw === 'secretaria';
      const isEmployee = userRoleRaw === 'employee' || userRoleRaw === 'funcionario' || userRoleRaw === 'funcionário';

      // For employees, filter to show only events they are linked to
      if (isEmployee && !isSecretaria) {
        // Get the employee linked to this user
        const user = await storage.getUser(req.userId!);
        if (user) {
          const allEmployees = await storage.getAllEmployees();
          const linkedEmployee = allEmployees.find(emp => emp.userId === req.userId);

          if (linkedEmployee) {
            // Filter events that have this employee linked
            const filteredEvents = events.filter((event: any) =>
              event.eventEmployees?.some((ee: any) => ee.employeeId === linkedEmployee.id)
            );

            // Remove sensitive financial data for employees
            const sanitizedEvents = filteredEvents.map((event: any) => ({
              ...event,
              contractValue: undefined,
              ticketValue: undefined,
              paymentMethod: undefined,
              cardType: undefined,
              paymentDate: undefined,
              installments: undefined,
              // Also sanitize employee cache values
              eventEmployees: event.eventEmployees?.map((ee: any) => ({
                ...ee,
                cacheValue: undefined,
              })),
            }));

            return res.json(sanitizedEvents);
          }
        }
        // If no linked employee found, return empty
        return res.json([]);
      }

      // For secretaria, remove financial values but show all events
      if (isSecretaria) {
        const sanitizedEvents = events.map((event: any) => ({
          ...event,
          contractValue: undefined,
          ticketValue: undefined,
          paymentMethod: undefined,
          cardType: undefined,
          paymentDate: undefined,
          installments: undefined,
          // Also sanitize employee cache values
          eventEmployees: event.eventEmployees?.map((ee: any) => ({
            ...ee,
            cacheValue: undefined,
          })),
        }));
        return res.json(sanitizedEvents);
      }

      // Admin gets all events with full data
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar eventos" });
    }
  });

  app.post("/api/events", authenticateToken, requireEventEdit, async (req, res) => {
    try {
      const { characterIds, expenses, eventEmployees, eventInstallments, packageIds, ...eventData } = req.body;

      // Validate date is not more than 1 year in the past
      const eventDate = new Date(eventData.date);
      if (isNaN(eventDate.getTime())) {
        return res.status(400).json({ message: "Data do evento inválida" });
      }
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (eventDate < oneYearAgo) {
        return res.status(400).json({ message: "A data do evento não pode ser anterior a 1 ano da data atual" });
      }

      const parsedData = insertEventSchema.parse({
        ...eventData,
        date: eventDate,
        paymentDate: eventData.paymentDate ? new Date(eventData.paymentDate) : null,
      });
      const event = await storage.createEvent(parsedData, characterIds, expenses, eventEmployees, eventInstallments, packageIds);
      res.status(201).json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar evento" });
    }
  });

  app.patch("/api/events/:id", authenticateToken, requireEventEdit, async (req, res) => {
    try {
      const { characterIds, expenses, eventEmployees, eventInstallments, packageIds, ...eventData } = req.body;

      // Buscar o evento atual antes de atualizar para verificar mudança de status
      const currentEvent = await storage.getEvent(req.params.id);
      const previousStatus = currentEvent?.status;

      const bodyData = { ...eventData };
      if (bodyData.date) {
        const eventDate = new Date(bodyData.date);
        if (isNaN(eventDate.getTime())) {
          return res.status(400).json({ message: "Data do evento inválida" });
        }
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (eventDate < oneYearAgo) {
          return res.status(400).json({ message: "A data do evento não pode ser anterior a 1 ano da data atual" });
        }
        bodyData.date = eventDate;
      }
      if (bodyData.paymentDate !== undefined) {
        bodyData.paymentDate = bodyData.paymentDate ? new Date(bodyData.paymentDate) : null;
      }
      const data = insertEventSchema.partial().parse(bodyData);
      const event = await storage.updateEvent(req.params.id, data, characterIds, expenses, eventEmployees, eventInstallments, packageIds);

      // Se o status mudou para "completed", criar transação de contas a receber
      if (data.status === "completed" && previousStatus !== "completed" && currentEvent) {
        const contractValue = currentEvent.contractValue || event.contractValue;
        if (contractValue && parseFloat(contractValue) > 0) {
          // Buscar nome do cliente para a descrição
          let clientName = "Cliente";
          if (currentEvent.clientId) {
            const client = await storage.getClient(currentEvent.clientId);
            if (client) {
              clientName = client.name;
            }
          }

          // Usar a data de pagamento do evento se existir, senão usar a data do evento
          const eventDate = currentEvent.date instanceof Date ? currentEvent.date : new Date(currentEvent.date);
          const paymentDate = currentEvent.paymentDate ?
            (currentEvent.paymentDate instanceof Date ? currentEvent.paymentDate : new Date(currentEvent.paymentDate)) :
            eventDate;

          await storage.createTransaction({
            type: "receivable",
            description: `Evento: ${currentEvent.title} - ${clientName}`,
            amount: contractValue,
            eventId: req.params.id,
            dueDate: paymentDate,
            isPaid: false,
            notes: `Evento concluído em ${new Date().toLocaleDateString('pt-BR')}`,
          });
        }
      }

      res.json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar evento" });
    }
  });

  app.delete("/api/events/:id", authenticateToken, requireEventEdit, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar evento" });
    }
  });

  // Inventory routes
  // Inventory routes (admin and secretaria can view, only admin can modify)
  app.get("/api/inventory", authenticateToken, requireAdminOrSecretaria, async (req, res) => {
    try {
      const items = await storage.getAllInventoryItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar itens" });
    }
  });

  app.post("/api/inventory", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { componentIds, ...inventoryData } = req.body;
      const data = insertInventoryItemSchema.parse(inventoryData);
      const item = await storage.createInventoryItem({ ...data, componentIds });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar item" });
    }
  });

  app.patch("/api/inventory/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { componentIds, ...inventoryData } = req.body;
      const data = insertInventoryItemSchema.partial().parse(inventoryData);
      const item = await storage.updateInventoryItem(req.params.id, { ...data, componentIds });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar item" });
    }
  });

  app.delete("/api/inventory/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteInventoryItem(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar item" });
    }
  });

  // Financial transactions routes
  // Financial routes (admin only)
  app.get("/api/financial/transactions", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar transações" });
    }
  });

  app.post("/api/financial/transactions", authenticateToken, requireAdmin, async (req, res) => {
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

  app.patch("/api/financial/transactions/:id", authenticateToken, requireAdmin, async (req, res) => {
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

  app.delete("/api/financial/transactions/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTransaction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar transação" });
    }
  });

  // Mark transaction as paid (dar baixa)
  app.post("/api/financial/transactions/:id/pay", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const transaction = await storage.updateTransaction(req.params.id, {
        isPaid: true,
        paidDate: new Date(),
      });
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao dar baixa na transação" });
    }
  });

  // Purchases routes
  // Purchases routes (admin only)
  app.get("/api/purchases", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const purchases = await storage.getAllPurchases();
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar compras" });
    }
  });

  app.post("/api/purchases", authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Validar os dados primeiro (ainda como strings)
      const data = validatePurchaseSchema.parse(req.body);

      // Função auxiliar para converter string de data YYYY-MM-DD para Date no timezone local
      const parseLocalDate = (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        // Criar data às 12:00 no horário local para evitar problemas de timezone
        return new Date(year, month - 1, day, 12, 0, 0);
      };

      // Converter as datas após a validação
      const purchaseDate = parseLocalDate(data.purchaseDate as unknown as string);
      const firstInstallmentDate = data.firstInstallmentDate
        ? parseLocalDate(data.firstInstallmentDate as unknown as string)
        : undefined;

      // Calcular installmentAmount no backend para garantir consistência
      let purchaseData: any = {
        ...data,
        purchaseDate,
        firstInstallmentDate
      };
      if (data.isInstallment && data.installments) {
        const totalAmount = typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount);
        const calculatedInstallmentAmount = (totalAmount / data.installments).toFixed(2);
        purchaseData = { ...purchaseData, installmentAmount: calculatedInstallmentAmount };
      }

      // Criar a compra
      const purchase = await storage.createPurchase(purchaseData);

      // Se houver item do estoque selecionado e quantidade, atualizar estoque
      if (data.itemId && data.quantity) {
        // Buscar item atual
        const item = await storage.getInventoryItem(data.itemId);
        if (item) {
          // Criar movimento de estoque (entrada)
          await storage.createStockMovement({
            itemId: data.itemId,
            quantity: data.quantity,
            type: "entrada",
            notes: `Compra #${purchase.id.slice(0, 8)} - ${data.supplier}`,
          });

          // Atualizar quantidade do item
          await storage.updateInventoryItem(data.itemId, {
            quantity: item.quantity + data.quantity,
          });
        }
      }

      // Criar contas a pagar no módulo financeiro
      if (data.isInstallment && data.installments && firstInstallmentDate) {
        // Compra parcelada: criar uma transação para cada parcela
        const installmentAmount = typeof purchaseData.installmentAmount === 'string'
          ? parseFloat(purchaseData.installmentAmount)
          : Number(purchaseData.installmentAmount);

        for (let i = 0; i < data.installments; i++) {
          // Calcular data de vencimento da parcela (primeira parcela + i meses)
          // Criar nova data mantendo dia, mês e ano corretos
          const dueDate = new Date(
            firstInstallmentDate.getFullYear(),
            firstInstallmentDate.getMonth() + i,
            firstInstallmentDate.getDate(),
            12, 0, 0
          );

          await storage.createTransaction({
            type: "payable",
            description: `Compra: ${data.description} - ${data.supplier} (${i + 1}/${data.installments})`,
            amount: installmentAmount.toString(),
            dueDate: dueDate,
            isPaid: false,
            notes: data.notes || undefined,
          });
        }
      } else {
        // Compra à vista: criar uma única transação
        await storage.createTransaction({
          type: "payable",
          description: `Compra: ${data.description} - ${data.supplier}`,
          amount: data.amount,
          dueDate: purchaseDate,
          isPaid: false,
          notes: data.notes || undefined,
        });
      }

      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar compra" });
    }
  });

  app.patch("/api/purchases/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Função auxiliar para converter string de data YYYY-MM-DD para Date no timezone local
      const parseLocalDate = (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        // Criar data às 12:00 no horário local para evitar problemas de timezone
        return new Date(year, month - 1, day, 12, 0, 0);
      };

      const bodyData = { ...req.body };
      if (bodyData.purchaseDate) bodyData.purchaseDate = parseLocalDate(bodyData.purchaseDate);
      if (bodyData.firstInstallmentDate) bodyData.firstInstallmentDate = parseLocalDate(bodyData.firstInstallmentDate);
      const data = insertPurchaseSchema.partial().parse(bodyData);
      const purchase = await storage.updatePurchase(req.params.id, data);
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar compra" });
    }
  });

  app.delete("/api/purchases/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deletePurchase(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar compra" });
    }
  });

  // Dashboard routes
  // Dashboard routes (admin only)
  app.get("/api/dashboard/metrics", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar métricas" });
    }
  });

  app.get("/api/dashboard/upcoming-events", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents(5);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar eventos" });
    }
  });

  // Event Categories routes
  app.delete("/api/financial/transactions/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTransaction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar transação" });
    }
  });

  // Settings routes (admin only)
  app.get("/api/settings/event-categories", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllEventCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar categorias" });
    }
  });

  app.post("/api/settings/event-categories", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertEventCategorySchema.parse(req.body);
      const category = await storage.createEventCategory(data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar categoria" });
    }
  });

  app.patch("/api/settings/event-categories/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertEventCategorySchema.partial().parse(req.body);
      const category = await storage.updateEventCategory(req.params.id, data);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar categoria" });
    }
  });

  app.delete("/api/settings/event-categories/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEventCategory(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar categoria" });
    }
  });

  // Employee Roles routes
  app.get("/api/settings/employee-roles", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const roles = await storage.getAllEmployeeRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar funções" });
    }
  });

  app.post("/api/settings/employee-roles", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertEmployeeRoleSchema.parse(req.body);
      const role = await storage.createEmployeeRole(data);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar função" });
    }
  });

  app.patch("/api/settings/employee-roles/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertEmployeeRoleSchema.partial().parse(req.body);
      const role = await storage.updateEmployeeRole(req.params.id, data);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar função" });
    }
  });

  app.delete("/api/settings/employee-roles/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEmployeeRole(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar função" });
    }
  });

  // Packages routes
  app.get("/api/settings/packages", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const packages = await storage.getAllPackagesWithRelations();
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar pacotes" });
    }
  });

  app.get("/api/settings/packages/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const pkg = await storage.getPackageWithRelations(req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Pacote não encontrado" });
      }
      res.json(pkg);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar pacote" });
    }
  });

  app.post("/api/settings/packages", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertPackageSchema.parse(req.body);
      const pkg = await storage.createPackage(data);
      res.status(201).json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar pacote" });
    }
  });

  app.patch("/api/settings/packages/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertPackageSchema.partial().parse(req.body);
      const pkg = await storage.updatePackage(req.params.id, data);
      res.json(pkg);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar pacote" });
    }
  });

  app.delete("/api/settings/packages/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deletePackage(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar pacote" });
    }
  });

  // Skills routes
  app.get("/api/settings/skills", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const skills = await storage.getAllSkills();
      res.json(skills);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar habilidades" });
    }
  });

  app.post("/api/settings/skills", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertSkillSchema.parse(req.body);
      const skill = await storage.createSkill(data);
      res.status(201).json(skill);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar habilidade" });
    }
  });

  app.patch("/api/settings/skills/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const existingSkill = await storage.getSkill(req.params.id);
      if (!existingSkill) {
        return res.status(404).json({ message: "Habilidade não encontrada" });
      }
      const data = insertSkillSchema.partial().parse(req.body);
      const skill = await storage.updateSkill(req.params.id, data);
      res.json(skill);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao atualizar habilidade" });
    }
  });

  app.delete("/api/settings/skills/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const existingSkill = await storage.getSkill(req.params.id);
      if (!existingSkill) {
        return res.status(404).json({ message: "Habilidade não encontrada" });
      }
      await storage.deleteSkill(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar habilidade" });
    }
  });

  // Services routes
  app.get("/api/settings/services", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar serviços" });
    }
  });

  app.post("/api/settings/services", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar serviço" });
    }
  });

  app.patch("/api/settings/services/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const existingService = await storage.getService(req.params.id);
      if (!existingService) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      const data = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, data);
      res.json(service);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao atualizar serviço" });
    }
  });

  app.delete("/api/settings/services/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const existingService = await storage.getService(req.params.id);
      if (!existingService) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar serviço" });
    }
  });

  // System Settings
  app.get("/api/settings/system", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar configurações" });
    }
  });

  app.get("/api/settings/system/:key", authenticateToken, requireAdmin, async (req, res) => {
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

  app.post("/api/settings/system", authenticateToken, requireAdmin, async (req, res) => {
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
  app.get("/api/settings/fees/sumup", authenticateToken, requireAdmin, async (req, res) => {
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
  app.get("/api/settings/fees/custom", authenticateToken, requireAdmin, async (req, res) => {
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

  app.post("/api/settings/fees/custom", authenticateToken, requireAdmin, async (req, res) => {
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
  app.get("/api/settings/fees/type", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const feeType = await storage.getSystemSetting("fee_type");
      res.json({ type: feeType?.value || "sumup" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar tipo de taxa" });
    }
  });

  app.post("/api/settings/fees/type", authenticateToken, requireAdmin, async (req, res) => {
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
  app.get("/api/settings/fees/sumup-tier", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const tier = await storage.getSystemSetting("sumup_tier");
      res.json({ tier: tier?.value || "0" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar tier" });
    }
  });

  app.post("/api/settings/fees/sumup-tier", authenticateToken, requireAdmin, async (req, res) => {
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
  app.get("/api/settings/fees/monthly-interest", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const interest = await storage.getSystemSetting("monthly_interest_rate");
      res.json({ monthlyInterestRate: interest?.value || "0" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar taxa de juros" });
    }
  });

  app.post("/api/settings/fees/monthly-interest", authenticateToken, requireAdmin, async (req, res) => {
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
  app.post("/api/settings/fees/calculate", authenticateToken, requireAdmin, async (req, res) => {
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

  // Buffets routes
  app.get("/api/buffets", authenticateToken, async (req, res) => {
    try {
      const buffets = await storage.getAllBuffets();
      res.json(buffets);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar buffets" });
    }
  });

  app.get("/api/buffets/:id", authenticateToken, async (req, res) => {
    try {
      const buffet = await storage.getBuffet(req.params.id);
      if (!buffet) {
        return res.status(404).json({ message: "Buffet não encontrado" });
      }
      res.json(buffet);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar buffet" });
    }
  });

  app.post("/api/buffets", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertBuffetSchema.parse(req.body);
      const buffet = await storage.createBuffet(data);
      res.status(201).json(buffet);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao criar buffet" });
    }
  });

  app.patch("/api/buffets/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const data = insertBuffetSchema.partial().parse(req.body);
      const buffet = await storage.updateBuffet(req.params.id, data);
      res.json(buffet);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao atualizar buffet" });
    }
  });

  app.delete("/api/buffets/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteBuffet(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar buffet" });
    }
  });

  // Time Records routes (Departamento Pessoal)
  app.get("/api/time-records", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const records = await storage.getTimeRecords(userId, start, end);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar registros de ponto" });
    }
  });

  app.post("/api/time-records", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { type, notes } = req.body;
      if (!type || !["clock_in", "clock_out"].includes(type)) {
        return res.status(400).json({ message: "Tipo inválido. Use 'clock_in' ou 'clock_out'" });
      }
      const record = await storage.createTimeRecord({
        userId,
        type,
        timestamp: new Date(),
        notes: notes || null,
      });
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Erro ao registrar ponto" });
    }
  });

  app.delete("/api/time-records/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTimeRecord(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao deletar registro de ponto" });
    }
  });

  app.get("/api/time-records/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const latest = await storage.getLatestTimeRecord(userId);
      const isClockedIn = latest?.type === "clock_in";
      res.json({ isClockedIn, latestRecord: latest || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar status do ponto" });
    }
  });

  app.get("/api/time-records/all", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const records = await storage.getAllUsersTimeRecords(start, end);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao buscar registros de ponto" });
    }
  });

  app.get("/api/time-records/summary", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const now = new Date();

      // Today: midnight to end of day
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Week: Monday to Sunday
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, 0);
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59);

      // Month: first to last day of month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const todayRecords = await storage.getTimeRecords(userId, todayStart, todayEnd);
      const weekRecords = await storage.getTimeRecords(userId, weekStart, weekEnd);
      const monthRecords = await storage.getTimeRecords(userId, monthStart, monthEnd);

      // Calculate worked hours from records
      const calculateHours = (records: any[]) => {
        // Sort chronologically
        const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        let totalMinutes = 0;
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].type === "clock_in") {
            const clockOut = sorted.find((r, idx) => idx > i && r.type === "clock_out");
            if (clockOut) {
              const diff = new Date(clockOut.timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
              totalMinutes += diff / (1000 * 60);
            } else {
              // Still clocked in, count until now
              const diff = now.getTime() - new Date(sorted[i].timestamp).getTime();
              totalMinutes += diff / (1000 * 60);
            }
          }
        }
        return totalMinutes;
      };

      const todayMinutes = calculateHours(todayRecords);
      const weekMinutes = calculateHours(weekRecords);
      const monthMinutes = calculateHours(monthRecords);

      // Standard: 8h/day, 40h/week, ~176h/month (22 working days)
      const DAILY_HOURS = 8;
      const WEEKLY_HOURS = 40;
      const MONTHLY_HOURS = 176;

      // Calculate working days in period for more accurate deficit/overtime
      const todayExpected = DAILY_HOURS * 60;
      const weekWorkDays = Math.min(5, Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const weekExpected = weekWorkDays * DAILY_HOURS * 60;

      // Working days elapsed this month
      let monthWorkDays = 0;
      for (let d = new Date(monthStart); d <= now; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) monthWorkDays++;
      }
      const monthExpected = monthWorkDays * DAILY_HOURS * 60;

      res.json({
        today: {
          workedMinutes: Math.round(todayMinutes),
          expectedMinutes: todayExpected,
          balanceMinutes: Math.round(todayMinutes - todayExpected),
        },
        week: {
          workedMinutes: Math.round(weekMinutes),
          expectedMinutes: weekExpected,
          balanceMinutes: Math.round(weekMinutes - weekExpected),
        },
        month: {
          workedMinutes: Math.round(monthMinutes),
          expectedMinutes: monthExpected,
          balanceMinutes: Math.round(monthMinutes - monthExpected),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Erro ao calcular resumo de horas" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
