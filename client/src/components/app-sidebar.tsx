import { Home, Users, UserCircle, Calendar, DollarSign, Package, ShoppingCart, Settings, LogOut, Building2 } from "lucide-react";
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

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Eventos",
    url: "/events",
    icon: Calendar,
  },
  {
    title: "Clientes",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Funcionários",
    url: "/employees",
    icon: UserCircle,
  },
  {
    title: "Estoque",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Financeiro",
    url: "/financial",
    icon: DollarSign,
  },
  {
    title: "Compras",
    url: "/purchases",
    icon: ShoppingCart,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
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

  return (
    <Sidebar className="border-none">
      <div className="flex h-full flex-col bg-gradient-to-b from-[#6C5584] via-[#5d4872] to-[#4d3b5f] relative overflow-hidden">
        {/* Top curved section */}
        <div className="relative pb-8">
          {/* White curved background */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-white rounded-br-[40px]"></div>
          
          {/* Header content */}
          <SidebarHeader className="relative z-10 px-5 pt-4 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C5584] shadow-sm">
                <Building2 className="h-4.5 w-4.5 text-white" />
              </div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">HAVR Tecnologia</h2>
            </div>
          </SidebarHeader>
        </div>

        <SidebarContent className="px-4 -mt-4">

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      className="h-10 px-3 text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/25 data-[active=true]:text-white rounded-lg font-medium transition-all"
                      data-testid={`link-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="ml-3">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-8 mb-4">
            <SidebarGroupLabel className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-white/50">
              Informações do Sistema
            </SidebarGroupLabel>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70 font-medium">Usuário Ativo</span>
                  <span className="text-xs text-white font-semibold truncate ml-2 max-w-[120px]">
                    {user?.name || "Carregando..."}
                  </span>
                </div>
                <div className="w-full h-px bg-white/10"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70 font-medium">Perfil</span>
                  <span className="text-xs text-white font-semibold">
                    {user?.role === 'admin' ? 'Admin' : 'Funcionário'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-4 mt-auto border-t border-white/10">
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
                {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
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
