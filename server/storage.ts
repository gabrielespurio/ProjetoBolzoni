// Database storage implementation following javascript_database blueprint
import {
  users,
  clients,
  employees,
  employeePayments,
  events,
  inventoryItems,
  stockMovements,
  financialTransactions,
  purchases,
  eventEmployees,
  eventCharacters,
  eventCategories,
  employeeRoles,
  packages,
  eventExpenses,
  systemSettings,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Employee,
  type InsertEmployee,
  type EmployeePayment,
  type InsertEmployeePayment,
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
  type Package,
  type InsertPackage,
  type EventExpense,
  type InsertEventExpense,
  type SystemSetting,
  type InsertSystemSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, ne, like } from "drizzle-orm";

// Função para calcular a próxima data de pagamento (dia 15 ou 30)
// Se o dia do evento for entre 1-15, paga no dia 15
// Se o dia do evento for entre 16-31, paga no dia 30
export function calculateNextPaymentDate(eventDate: Date): Date {
  const day = eventDate.getDate();
  const month = eventDate.getMonth();
  const year = eventDate.getFullYear();
  
  if (day <= 15) {
    // Próximo pagamento é dia 15 do mesmo mês
    return new Date(year, month, 15, 12, 0, 0);
  } else {
    // Próximo pagamento é dia 30 do mesmo mês
    // Se o mês não tiver dia 30 (fevereiro), usa o último dia do mês
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const paymentDay = Math.min(30, lastDayOfMonth);
    return new Date(year, month, paymentDay, 12, 0, 0);
  }
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
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
  
  // Employee Payments
  getEmployeePayments(employeeId: string): Promise<EmployeePayment[]>;
  createEmployeePayment(employeeId: string, payment: Omit<InsertEmployeePayment, 'employeeId'>): Promise<EmployeePayment>;
  deleteEmployeePayment(id: string): Promise<void>;
  
  // Events
  getAllEvents(): Promise<any[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent, characterIds?: string[], expenses?: Array<Omit<InsertEventExpense, 'eventId'>>, eventEmployees?: Array<{employeeId: string, characterId?: string | null, cacheValue: string}>): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>, characterIds?: string[], expenses?: Array<Omit<InsertEventExpense, 'eventId'>>, eventEmployees?: Array<{employeeId: string, characterId?: string | null, cacheValue: string}>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getUpcomingEvents(limit?: number): Promise<any[]>;
  
  // Event Characters
  addEventCharacters(eventId: string, characterIds: string[]): Promise<void>;
  removeEventCharacters(eventId: string): Promise<void>;
  
  // Event Expenses
  getEventExpenses(eventId: string): Promise<EventExpense[]>;
  addEventExpenses(eventId: string, expenses: Array<Omit<InsertEventExpense, 'eventId'>>): Promise<void>;
  removeEventExpenses(eventId: string): Promise<void>;
  
  // Event Employees
  addEventEmployees(eventId: string, employees: Array<{employeeId: string, characterId?: string | null, cacheValue: string}>, eventTitle?: string, eventDate?: Date): Promise<void>;
  removeEventEmployees(eventId: string): Promise<void>;
  
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
  
  // Settings - Packages
  getAllPackages(): Promise<Package[]>;
  getPackage(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package>;
  deletePackage(id: string): Promise<void>;
  
  // Settings - System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(key: string, value: string): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
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
  
  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return updated;
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
  
  // Employee Payments
  async getEmployeePayments(employeeId: string): Promise<EmployeePayment[]> {
    return await db
      .select()
      .from(employeePayments)
      .where(eq(employeePayments.employeeId, employeeId))
      .orderBy(desc(employeePayments.paymentDate));
  }
  
  async createEmployeePayment(employeeId: string, payment: Omit<InsertEmployeePayment, 'employeeId'>): Promise<EmployeePayment> {
    const [newPayment] = await db
      .insert(employeePayments)
      .values({ ...payment, employeeId })
      .returning();
    return newPayment;
  }
  
  async deleteEmployeePayment(id: string): Promise<void> {
    await db.delete(employeePayments).where(eq(employeePayments.id, id));
  }
  
  // Events
  async getAllEvents(): Promise<any[]> {
    const allEvents = await db
      .select({
        id: events.id,
        clientId: events.clientId,
        categoryId: events.categoryId,
        title: events.title,
        date: events.date,
        cep: events.cep,
        estado: events.estado,
        cidade: events.cidade,
        bairro: events.bairro,
        rua: events.rua,
        venueName: events.venueName,
        venueNumber: events.venueNumber,
        kmDistance: events.kmDistance,
        contractValue: events.contractValue,
        ticketValue: events.ticketValue,
        paymentMethod: events.paymentMethod,
        cardType: events.cardType,
        paymentDate: events.paymentDate,
        installments: events.installments,
        packageId: events.packageId,
        packageName: packages.name,
        packageNotes: events.packageNotes,
        status: events.status,
        notes: events.notes,
        createdAt: events.createdAt,
        clientName: clients.name,
        clientPersonType: clients.personType,
        clientCnpj: clients.cnpj,
        clientCpf: clients.cpf,
        clientRg: clients.rg,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        clientRua: clients.rua,
        clientNumero: clients.numero,
        clientBairro: clients.bairro,
        clientCidade: clients.cidade,
        clientEstado: clients.estado,
        clientResponsibleName: clients.responsibleName,
        clientCargo: clients.cargo,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .leftJoin(packages, eq(events.packageId, packages.id))
      .where(ne(events.status, "deleted"))
      .orderBy(desc(events.date));
    
    const eventsWithDetails = await Promise.all(
      allEvents.map(async (event) => {
        const characters = await db
          .select({ 
            characterId: eventCharacters.characterId,
            characterName: inventoryItems.name
          })
          .from(eventCharacters)
          .leftJoin(inventoryItems, eq(eventCharacters.characterId, inventoryItems.id))
          .where(eq(eventCharacters.eventId, event.id));
        
        const eventEmps = await db
          .select({
            employeeId: eventEmployees.employeeId,
            employeeName: employees.name,
            characterId: eventEmployees.characterId,
            cacheValue: eventEmployees.cacheValue,
          })
          .from(eventEmployees)
          .leftJoin(employees, eq(eventEmployees.employeeId, employees.id))
          .where(eq(eventEmployees.eventId, event.id));
        
        const eventEmpsWithCharacters = await Promise.all(
          eventEmps.map(async (emp) => {
            if (emp.characterId) {
              const [character] = await db
                .select({ name: inventoryItems.name })
                .from(inventoryItems)
                .where(eq(inventoryItems.id, emp.characterId));
              return {
                ...emp,
                characterName: character?.name || null,
              };
            }
            return { ...emp, characterName: null };
          })
        );
        
        return {
          ...event,
          characterIds: characters.map(c => c.characterId),
          characterNames: characters.map(c => c.characterName).filter(Boolean),
          eventEmployees: eventEmpsWithCharacters,
        };
      })
    );
    
    return eventsWithDetails;
  }
  
  async getEvent(id: string): Promise<any> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return undefined;
    
    const characters = await db
      .select({ characterId: eventCharacters.characterId })
      .from(eventCharacters)
      .where(eq(eventCharacters.eventId, id));
    
    const expenses = await this.getEventExpenses(id);
    
    const eventEmps = await db
      .select({
        employeeId: eventEmployees.employeeId,
        characterId: eventEmployees.characterId,
        cacheValue: eventEmployees.cacheValue,
      })
      .from(eventEmployees)
      .where(eq(eventEmployees.eventId, id));
    
    return {
      ...event,
      characterIds: characters.map(c => c.characterId),
      expenses,
      eventEmployees: eventEmps,
    };
  }
  
  async createEvent(event: InsertEvent, characterIds?: string[], expenses?: Array<Omit<InsertEventExpense, 'eventId'>>, eventEmployees?: Array<{employeeId: string, characterId?: string | null, cacheValue: string}>): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    
    if (characterIds && characterIds.length > 0) {
      await this.addEventCharacters(newEvent.id, characterIds);
    }
    
    if (expenses && expenses.length > 0) {
      await this.addEventExpenses(newEvent.id, expenses);
    }
    
    if (eventEmployees && eventEmployees.length > 0) {
      // Passar título e data do evento para criar as transações de cachê
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
      await this.addEventEmployees(newEvent.id, eventEmployees, event.title, eventDate);
    }
    
    return newEvent;
  }
  
  async updateEvent(id: string, event: Partial<InsertEvent>, characterIds?: string[], expenses?: Array<Omit<InsertEventExpense, 'eventId'>>, eventEmployees?: Array<{employeeId: string, characterId?: string | null, cacheValue: string}>): Promise<Event> {
    const [updated] = await db.update(events).set(event).where(eq(events.id, id)).returning();
    
    if (characterIds !== undefined) {
      await this.removeEventCharacters(id);
      if (characterIds.length > 0) {
        await this.addEventCharacters(id, characterIds);
      }
    }
    
    if (expenses !== undefined) {
      await this.removeEventExpenses(id);
      if (expenses.length > 0) {
        await this.addEventExpenses(id, expenses);
      }
    }
    
    if (eventEmployees !== undefined) {
      await this.removeEventEmployees(id);
      if (eventEmployees.length > 0) {
        // Usar os dados atualizados do evento para criar as transações de cachê
        const eventDate = updated.date instanceof Date ? updated.date : new Date(updated.date);
        await this.addEventEmployees(id, eventEmployees, updated.title, eventDate);
      }
    }
    
    return updated;
  }
  
  async deleteEvent(id: string): Promise<void> {
    await this.removeEventCharacters(id);
    await this.removeEventExpenses(id);
    await this.removeEventEmployees(id);
    await db.delete(events).where(eq(events.id, id));
  }
  
  async addEventCharacters(eventId: string, characterIds: string[]): Promise<void> {
    const values = characterIds.map(characterId => ({
      eventId,
      characterId,
    }));
    await db.insert(eventCharacters).values(values);
  }
  
  async removeEventCharacters(eventId: string): Promise<void> {
    await db.delete(eventCharacters).where(eq(eventCharacters.eventId, eventId));
  }
  
  async getUpcomingEvents(limit: number = 10): Promise<any[]> {
    const now = new Date();
    const upcomingEvents = await db
      .select({
        id: events.id,
        clientId: events.clientId,
        title: events.title,
        date: events.date,
        cep: events.cep,
        estado: events.estado,
        cidade: events.cidade,
        bairro: events.bairro,
        rua: events.rua,
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
  
  // Packages
  async getAllPackages(): Promise<Package[]> {
    return await db.select().from(packages).orderBy(packages.name);
  }
  
  async getPackage(id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg || undefined;
  }
  
  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [newPackage] = await db.insert(packages).values(pkg).returning();
    return newPackage;
  }
  
  async updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package> {
    const [updated] = await db.update(packages).set(pkg).where(eq(packages.id, id)).returning();
    return updated;
  }
  
  async deletePackage(id: string): Promise<void> {
    await db.delete(packages).where(eq(packages.id, id));
  }
  
  // Event Expenses
  async getEventExpenses(eventId: string): Promise<EventExpense[]> {
    return await db.select().from(eventExpenses).where(eq(eventExpenses.eventId, eventId));
  }
  
  async addEventExpenses(eventId: string, expenses: Array<Omit<InsertEventExpense, 'eventId'>>): Promise<void> {
    if (expenses.length === 0) return;
    const values = expenses.map(expense => ({
      ...expense,
      eventId,
    }));
    await db.insert(eventExpenses).values(values);
  }
  
  async removeEventExpenses(eventId: string): Promise<void> {
    await db.delete(eventExpenses).where(eq(eventExpenses.eventId, eventId));
  }
  
  // Event Employees
  async addEventEmployees(eventId: string, employees: Array<{employeeId: string, characterId?: string | null, cacheValue: string}>, eventTitle?: string, eventDate?: Date): Promise<void> {
    if (employees.length === 0) return;
    const values = employees.map(emp => ({
      eventId,
      employeeId: emp.employeeId,
      characterId: emp.characterId || null,
      cacheValue: emp.cacheValue,
    }));
    await db.insert(eventEmployees).values(values);
    
    // Criar transações financeiras de cachê para cada funcionário
    if (eventTitle && eventDate) {
      for (const emp of employees) {
        const cacheAmount = parseFloat(emp.cacheValue);
        if (cacheAmount > 0) {
          // Buscar nome do funcionário
          const employee = await this.getEmployee(emp.employeeId);
          const employeeName = employee?.name || 'Funcionário';
          
          // Buscar nome do personagem (se houver)
          let characterName = '';
          if (emp.characterId) {
            const character = await this.getInventoryItem(emp.characterId);
            characterName = character?.name ? ` ${character.name}` : '';
          }
          
          // Calcular data de vencimento (próximo dia 15 ou 30 do mesmo mês)
          // Se evento entre dias 1-15, paga dia 15
          // Se evento entre dias 16-31, paga dia 30
          const dueDate = calculateNextPaymentDate(eventDate);
          
          // Criar transação de cachê com referência ao evento e funcionário no notes
          // Formato: [CACHE_REF:eventId:employeeId] para facilitar busca e remoção
          await this.createTransaction({
            type: 'payable',
            description: `Cachê - ${employeeName}${characterName} - Evento: ${eventTitle}`,
            amount: emp.cacheValue,
            dueDate: dueDate,
            isPaid: false,
            notes: `[CACHE_REF:${eventId}:${emp.employeeId}] Pagamento de cachê referente ao evento realizado em ${eventDate.toLocaleDateString('pt-BR')}`,
          });
        }
      }
    }
  }
  
  async removeEventEmployees(eventId: string): Promise<void> {
    // Remover transações de cachê relacionadas usando a referência no notes
    // Buscar todas as transações que contêm a referência ao eventId
    const allTransactions = await db.select().from(financialTransactions).where(
      eq(financialTransactions.type, 'payable')
    );
    
    // Filtrar transações que correspondem a este evento
    for (const transaction of allTransactions) {
      if (transaction.notes && transaction.notes.includes(`[CACHE_REF:${eventId}:`)) {
        await db.delete(financialTransactions).where(eq(financialTransactions.id, transaction.id));
      }
    }
    
    await db.delete(eventEmployees).where(eq(eventEmployees.eventId, eventId));
  }
  
  // System Settings
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }
  
  async upsertSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(key);
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemSettings)
        .values({ key, value })
        .returning();
      return created;
    }
  }
  
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }
}

export const storage = new DatabaseStorage();
