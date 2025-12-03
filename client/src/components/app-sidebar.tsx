import { Home, Users, UserCircle, Calendar, CalendarDays, DollarSign, Package, ShoppingCart, Settings, LogOut, Building2, FileSpreadsheet } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type UserRole = 'admin' | 'employee' | 'secretaria';

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Home;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    roles: ['admin'],
  },
  {
    title: "Eventos",
    url: "/events",
    icon: Calendar,
    roles: ['admin', 'employee', 'secretaria'],
  },
  {
    title: "Agenda",
    url: "/agenda",
    icon: CalendarDays,
    roles: ['admin', 'employee', 'secretaria'],
  },
  {
    title: "Clientes",
    url: "/clients",
    icon: Users,
    roles: ['admin', 'secretaria'],
  },
  {
    title: "Funcionários",
    url: "/employees",
    icon: UserCircle,
    roles: ['admin'],
  },
  {
    title: "Estoque",
    url: "/inventory",
    icon: Package,
    roles: ['admin', 'secretaria'],
  },
  {
    title: "Financeiro",
    url: "/financial",
    icon: DollarSign,
    roles: ['admin'],
  },
  {
    title: "Compras",
    url: "/purchases",
    icon: ShoppingCart,
    roles: ['admin'],
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: FileSpreadsheet,
    roles: ['admin'],
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
    roles: ['admin'],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole: UserRole = user?.role || 'employee';
  
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <Sidebar className="border-none">
      <div className="flex h-full flex-col bg-gradient-to-b from-[#6C5584] via-[#5d4872] to-[#4d3b5f]">
        <SidebarHeader className="px-3 md:px-5 pt-4 md:pt-5 pb-4 md:pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-white/20 shadow-sm">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight">HAVR Tecnologia</h2>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 md:px-4 flex-1 overflow-y-auto scrollbar-hide">

          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {filteredMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      className="h-9 md:h-10 px-3 text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/25 data-[active=true]:text-white rounded-lg font-medium transition-all"
                      data-testid={`link-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                        <span className="ml-2 md:ml-3 text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="p-3 md:p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-9 w-9 border-2 border-white/20 shadow-md">
              <AvatarFallback className="bg-white text-[#6C5584] text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || "Usuário"}
              </p>
              <p className="text-xs text-white/60 truncate">
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'secretaria' ? 'Secretária' : 'Funcionário'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 flex-shrink-0 hover:bg-white/10 text-white transition-colors"
              title="Sair do sistema"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
