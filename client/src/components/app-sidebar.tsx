import { Home, Users, UserCircle, Calendar, DollarSign, Package, ShoppingCart, Settings, LogOut, Building2, Plus } from "lucide-react";
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
    <Sidebar className="border-none overflow-visible">
      <div className="flex h-full flex-col bg-gradient-to-b from-[#6C5584] via-[#5d4872] to-[#4d3b5f] relative">
        {/* Curved top section */}
        <div className="relative">
          <div className="h-24 bg-gradient-to-b from-[#6C5584] to-[#6C5584]">
            {/* SVG Wave at bottom */}
            <svg 
              className="absolute bottom-0 left-0 w-full" 
              viewBox="0 0 256 40" 
              preserveAspectRatio="none"
              style={{ height: '40px' }}
            >
              <path 
                d="M0,0 L0,20 Q128,40 256,20 L256,0 Z" 
                fill="#6C5584"
              />
            </svg>
          </div>
        </div>

        {/* Header with logo - positioned to extend outside */}
        <div className="absolute top-4 left-4 right-0 z-10">
          <div className="flex items-center gap-2.5 bg-white rounded-l-xl py-3 px-4 shadow-lg" style={{ width: 'calc(100% + 48px)' }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5584] to-[#5d4872]">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-800 tracking-tight">HAVR Tecnologia</h2>
          </div>
        </div>

        <SidebarContent className="px-3 pt-16 pb-4">
          <div className="mb-4 px-2">
            <Button
              className="w-full h-11 bg-white hover:bg-white/95 text-[#6C5584] font-semibold shadow-md hover:shadow-lg transition-all rounded-full"
              data-testid="button-new-event"
              asChild
            >
              <Link href="/events">
                <Plus className="h-5 w-5 mr-2" />
                Novo Evento
              </Link>
            </Button>
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      className="h-10 px-3 text-white/90 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white rounded-lg font-medium transition-all"
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

          <div className="mt-6 px-2">
            <SidebarGroupLabel className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-white/60">
              Informações do Sistema
            </SidebarGroupLabel>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">Usuário Ativo</span>
                  <span className="text-white font-semibold">{user?.name || "Carregando..."}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">Perfil</span>
                  <span className="text-white font-semibold capitalize">
                    {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-4 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-9 w-9 border-2 border-white/30 shadow-md">
              <AvatarFallback className="bg-white text-[#6C5584] text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || "Usuário"}
              </p>
              <p className="text-xs text-white/70 truncate">
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
