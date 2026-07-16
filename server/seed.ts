import { storage } from "./storage";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");
    
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername("admin");
    
    if (existingAdmin) {
      console.log("✅ Admin user already exists, skipping seed");
      return;
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await storage.createUser({
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      role: "admin",
    });
    
    console.log("✅ Admin user created:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   Role: admin");
    
    // Create some sample data
    const client1 = await storage.createClient({
      name: "Maria Silva",
      phone: "(11) 98765-4321",
      email: "maria.silva@email.com",
      cidade: "São Paulo",
      notes: "Cliente preferencial, gosta de temas da Disney",
    });
    
    const client2 = await storage.createClient({
      name: "João Santos",
      phone: "(11) 91234-5678",
      email: "joao.santos@email.com",
      cidade: "Campinas",
      notes: "Eventos corporativos e festas infantis",
    });
    
    console.log(`✅ Created ${2} sample clients`);
    
    // Create sample employees
    await storage.createEmployee({
      name: "Carlos Recreador",
      role: "Recreador",
      phone: "(11) 99999-1111",
      email: "carlos@bolzoni.com",
      isAvailable: true,
      clocksIn: false,
      workloadHours: 8,
    } as any);
    
    await storage.createEmployee({
      name: "Ana Caracterista",
      role: "Caracterista",
      phone: "(11) 99999-2222",
      email: "ana@bolzoni.com",
      isAvailable: true,
      clocksIn: false,
      workloadHours: 8,
    } as any);
    
    console.log(`✅ Created ${2} sample employees`);
    
    // Create sample inventory items
    await storage.createInventoryItem({
      name: "Fantasia Homem-Aranha",
      type: "character",
      quantity: 3,
      minQuantity: 1,
      unit: "un",
      notes: "Tamanhos: P, M, G",
    });
    
    await storage.createInventoryItem({
      name: "Fantasia Frozen",
      type: "character",
      quantity: 2,
      minQuantity: 1,
      unit: "un",
      notes: "Elsa e Anna",
    });
    
    await storage.createInventoryItem({
      name: "Balões coloridos",
      type: "material",
      quantity: 500,
      minQuantity: 100,
      unit: "un",
      notes: "Diversas cores",
    });
    
    await storage.createInventoryItem({
      name: "Tinta facial",
      type: "material",
      quantity: 15,
      minQuantity: 20,
      unit: "un",
      notes: "Atenção: estoque baixo!",
    });
    
    console.log(`✅ Created ${4} sample inventory items`);
    
    // Create sample event
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    await storage.createEvent({
      clientId: client1.id,
      title: "Festa de Aniversário - 5 anos",
      date: futureDate,
      rua: "Rua das Flores",
      venueNumber: "123",
      cidade: "São Paulo",
      estado: "SP",
      contractValue: "1500.00",
      status: "scheduled",
      notes: "Tema: Princesas Disney",
    });
    
    console.log(`✅ Created ${1} sample event`);
    
    // Create sample financial transactions
    await storage.createTransaction({
      type: "receivable",
      description: "Pagamento evento - Maria Silva",
      amount: "1500.00",
      dueDate: futureDate,
      isPaid: false,
      notes: "Pagamento no dia do evento",
    });
    
    await storage.createTransaction({
      type: "payable",
      description: "Compra de materiais - Balões",
      amount: "350.00",
      dueDate: new Date(),
      isPaid: true,
      paidDate: new Date(),
      notes: "Fornecedor: Balões & Cia",
    });
    
    console.log(`✅ Created ${2} sample financial transactions`);
    
    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📝 You can now login with:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
