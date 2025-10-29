// Database storage implementation following javascript_database blueprint
import {
  users,
  clients,
  employees,
  events,
  inventoryItems,
  stockMovements,
  financialTransactions,
  purchases,
  eventEmployees,
  eventCharacters,
  eventCategories,
  employeeRoles,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Employee,
  type InsertEmployee,
  type Event,
  type InsertEvent,
  type InventoryItem,
  type InsertInventoryItem,
  type StockMovement,
  type InsertStockMovement,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type Purchase,
  type InsertPurchase,
  type EventEmployee,
  type InsertEventEmployee,
  type EventCharacter,
  type InsertEventCharacter,
  type EventCategory,
  type InsertEventCategory,
  type EmployeeRole,
  type InsertEmployeeRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
  // Employees
  getAllEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  
  // Events
  getAllEvents(): Promise<any[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getUpcomingEvents(limit?: number): Promise<any[]>;
  
  // Inventory
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: string): Promise<void>;
  getLowStockItems(): Promise<InventoryItem[]>;
  
  // Stock Movements
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  
  // Financial Transactions
  getAllTransactions(): Promise<FinancialTransaction[]>;
  getTransaction(id: string): Promise<FinancialTransaction | undefined>;
  createTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateTransaction(id: string, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction>;
  deleteTransaction(id: string): Promise<void>;
  
  // Purchases
  getAllPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase>;
  deletePurchase(id: string): Promise<void>;
  
  // Dashboard
  getDashboardMetrics(): Promise<any>;
  
  // Settings - Event Categories
  getAllEventCategories(): Promise<EventCategory[]>;
  getEventCategory(id: string): Promise<EventCategory | undefined>;
  createEventCategory(category: InsertEventCategory): Promise<EventCategory>;
  updateEventCategory(id: string, category: Partial<InsertEventCategory>): Promise<EventCategory>;
  deleteEventCategory(id: string): Promise<void>;
  
  // Settings - Employee Roles
  getAllEmployeeRoles(): Promise<EmployeeRole[]>;
  getEmployeeRole(id: string): Promise<EmployeeRole | undefined>;
  createEmployeeRole(role: InsertEmployeeRole): Promise<EmployeeRole>;
  updateEmployeeRole(id: string, role: Partial<InsertEmployeeRole>): Promise<EmployeeRole>;
  deleteEmployeeRole(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Clients
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }
  
  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return updated;
  }
  
  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }
  
  // Employees
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }
  
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }
  
  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
    return updated;
  }
  
  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }
  
  // Events
  async getAllEvents(): Promise<any[]> {
    const allEvents = await db
      .select({
        id: events.id,
        clientId: events.clientId,
        title: events.title,
        date: events.date,
        location: events.location,
        contractValue: events.contractValue,
        status: events.status,
        notes: events.notes,
        createdAt: events.createdAt,
        clientName: clients.name,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .orderBy(desc(events.date));
    
    return allEvents;
  }
  
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }
  
  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db.update(events).set(event).where(eq(events.id, id)).returning();
    return updated;
  }
  
  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }
  
  async getUpcomingEvents(limit: number = 10): Promise<any[]> {
    const now = new Date();
    const upcomingEvents = await db
      .select({
        id: events.id,
        clientId: events.clientId,
        title: events.title,
        date: events.date,
        location: events.location,
        contractValue: events.contractValue,
        status: events.status,
        clientName: clients.name,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .where(
        and(
          gte(events.date, now),
          eq(events.status, "scheduled")
        )
      )
      .orderBy(events.date)
      .limit(limit);
    
    return upcomingEvents;
  }
  
  // Inventory
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
  }
  
  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }
  
  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }
  
  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updated] = await db.update(inventoryItems).set(item).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }
  
  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }
  
  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minQuantity}`);
  }
  
  // Stock Movements
  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [newMovement] = await db.insert(stockMovements).values(movement).returning();
    return newMovement;
  }
  
  // Financial Transactions
  async getAllTransactions(): Promise<FinancialTransaction[]> {
    return await db.select().from(financialTransactions).orderBy(desc(financialTransactions.dueDate));
  }
  
  async getTransaction(id: string): Promise<FinancialTransaction | undefined> {
    const [transaction] = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id));
    return transaction || undefined;
  }
  
  async createTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [newTransaction] = await db.insert(financialTransactions).values(transaction).returning();
    return newTransaction;
  }
  
  async updateTransaction(id: string, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction> {
    const [updated] = await db.update(financialTransactions).set(transaction).where(eq(financialTransactions.id, id)).returning();
    return updated;
  }
  
  async deleteTransaction(id: string): Promise<void> {
    await db.delete(financialTransactions).where(eq(financialTransactions.id, id));
  }
  
  // Purchases
  async getAllPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases).orderBy(desc(purchases.purchaseDate));
  }
  
  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase || undefined;
  }
  
  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }
  
  async updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase> {
    const [updated] = await db.update(purchases).set(purchase).where(eq(purchases.id, id)).returning();
    return updated;
  }
  
  async deletePurchase(id: string): Promise<void> {
    await db.delete(purchases).where(eq(purchases.id, id));
  }
  
  // Dashboard
  async getDashboardMetrics(): Promise<any> {
    const allTransactions = await this.getAllTransactions();
    const lowStockItems = await this.getLowStockItems();
    
    // Calculate cash balance
    const cashBalance = allTransactions.reduce((acc, t) => {
      if (!t.isPaid) return acc;
      const amount = parseFloat(t.amount);
      return t.type === 'receivable' ? acc + amount : acc - amount;
    }, 0);
    
    // Calculate monthly revenue (current month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyRevenue = allTransactions
      .filter(t => {
        const date = new Date(t.createdAt);
        return t.type === 'receivable' && 
               t.isPaid &&
               date >= firstDayOfMonth && 
               date <= lastDayOfMonth;
      })
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    
    // Count events this month
    const allEvents = await this.getAllEvents();
    const eventsThisMonth = allEvents.filter(e => {
      const date = new Date(e.date);
      return date >= firstDayOfMonth && date <= lastDayOfMonth;
    }).length;
    
    // Monthly revenue chart (last 6 months)
    const monthlyRevenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short' });
      
      const revenue = allTransactions
        .filter(t => {
          const date = new Date(t.createdAt);
          return t.type === 'receivable' && 
                 t.isPaid &&
                 date >= monthDate && 
                 date < nextMonthDate;
        })
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);
      
      monthlyRevenueChart.push({ month: monthName, revenue });
    }
    
    // Cash flow chart (last 7 days)
    const cashFlowChart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayTransactions = allTransactions.filter(t => {
        if (!t.isPaid || !t.paidDate) return false;
        const paidDate = new Date(t.paidDate);
        return paidDate >= date && paidDate < nextDate;
      });
      
      const balance = dayTransactions.reduce((acc, t) => {
        const amount = parseFloat(t.amount);
        return t.type === 'receivable' ? acc + amount : acc - amount;
      }, 0);
      
      cashFlowChart.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        balance
      });
    }
    
    return {
      cashBalance,
      monthlyRevenue,
      eventsThisMonth,
      lowStockItems: lowStockItems.length,
      monthlyRevenueChart,
      cashFlowChart,
    };
  }
  
  // Event Categories
  async getAllEventCategories(): Promise<EventCategory[]> {
    return await db.select().from(eventCategories).orderBy(eventCategories.name);
  }
  
  async getEventCategory(id: string): Promise<EventCategory | undefined> {
    const [category] = await db.select().from(eventCategories).where(eq(eventCategories.id, id));
    return category || undefined;
  }
  
  async createEventCategory(category: InsertEventCategory): Promise<EventCategory> {
    const [newCategory] = await db.insert(eventCategories).values(category).returning();
    return newCategory;
  }
  
  async updateEventCategory(id: string, category: Partial<InsertEventCategory>): Promise<EventCategory> {
    const [updated] = await db.update(eventCategories).set(category).where(eq(eventCategories.id, id)).returning();
    return updated;
  }
  
  async deleteEventCategory(id: string): Promise<void> {
    await db.delete(eventCategories).where(eq(eventCategories.id, id));
  }
  
  // Employee Roles
  async getAllEmployeeRoles(): Promise<EmployeeRole[]> {
    return await db.select().from(employeeRoles).orderBy(employeeRoles.name);
  }
  
  async getEmployeeRole(id: string): Promise<EmployeeRole | undefined> {
    const [role] = await db.select().from(employeeRoles).where(eq(employeeRoles.id, id));
    return role || undefined;
  }
  
  async createEmployeeRole(role: InsertEmployeeRole): Promise<EmployeeRole> {
    const [newRole] = await db.insert(employeeRoles).values(role).returning();
    return newRole;
  }
  
  async updateEmployeeRole(id: string, role: Partial<InsertEmployeeRole>): Promise<EmployeeRole> {
    const [updated] = await db.update(employeeRoles).set(role).where(eq(employeeRoles.id, id)).returning();
    return updated;
  }
  
  async deleteEmployeeRole(id: string): Promise<void> {
    await db.delete(employeeRoles).where(eq(employeeRoles.id, id));
  }
}

export const storage = new DatabaseStorage();
