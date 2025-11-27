import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Employees from "@/pages/employees";
import Events from "@/pages/events";
import Agenda from "@/pages/agenda";
import Financial from "@/pages/financial";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";

type UserRole = 'admin' | 'employee';

const employeeAllowedRoutes = ['/events', '/agenda', '/clients'];

function RoleProtectedRoute({ 
  component: Component, 
  adminOnly = false 
}: { 
  component: React.ComponentType; 
  adminOnly?: boolean;
}) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole: UserRole = user?.role || 'employee';
  
  if (adminOnly && userRole !== 'admin') {
    return <Redirect to="/events" />;
  }
  
  return <Component />;
}

function Router() {
  const [location] = useLocation();
  const isLoginPage = location === "/login";

  if (isLoginPage) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
      </Switch>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-16 items-center justify-between border-b border-border px-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-sm font-medium text-muted-foreground">
                Sistema de Gestão - Bolzoni Produções
              </h1>
            </header>
            <main className="flex-1 overflow-y-auto bg-background p-8">
              <div className="mx-auto max-w-7xl">
                <Switch>
                  <Route path="/">
                    <RoleProtectedRoute component={Dashboard} adminOnly />
                  </Route>
                  <Route path="/clients" component={Clients} />
                  <Route path="/employees">
                    <RoleProtectedRoute component={Employees} adminOnly />
                  </Route>
                  <Route path="/events" component={Events} />
                  <Route path="/agenda" component={Agenda} />
                  <Route path="/financial">
                    <RoleProtectedRoute component={Financial} adminOnly />
                  </Route>
                  <Route path="/inventory">
                    <RoleProtectedRoute component={Inventory} adminOnly />
                  </Route>
                  <Route path="/purchases">
                    <RoleProtectedRoute component={Purchases} adminOnly />
                  </Route>
                  <Route path="/reports">
                    <RoleProtectedRoute component={Reports} adminOnly />
                  </Route>
                  <Route path="/settings">
                    <RoleProtectedRoute component={Settings} adminOnly />
                  </Route>
                  <Route component={NotFound} />
                </Switch>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
