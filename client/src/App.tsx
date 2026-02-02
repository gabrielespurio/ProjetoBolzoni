import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Buffets from "@/pages/buffets";
import Employees from "@/pages/employees";
import Events from "@/pages/events";
import Agenda from "@/pages/agenda";
import Financial from "@/pages/financial";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";

type UserRole = 'admin' | 'employee' | 'secretaria';

function RoleProtectedRoute({ 
  component: Component, 
  allowedRoles = ['admin']
}: { 
  component: React.ComponentType; 
  allowedRoles?: UserRole[];
}) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole: UserRole = user?.role || 'employee';
  
  if (!allowedRoles.includes(userRole)) {
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
            <header className="flex h-14 md:h-16 items-center justify-between border-b border-border px-3 md:px-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xs md:text-sm font-medium text-muted-foreground truncate ml-2">
                Sistema de Gestão - Bolzoni Produções
              </h1>
            </header>
            <main className="flex-1 overflow-y-auto bg-background p-3 md:p-6 lg:p-8">
              <div className="mx-auto max-w-7xl">
                <Switch>
                  <Route path="/">
                    <RoleProtectedRoute component={Dashboard} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/clients">
                    <RoleProtectedRoute component={Clients} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/buffets">
                    <RoleProtectedRoute component={Buffets} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/employees">
                    <RoleProtectedRoute component={Employees} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/events" component={Events} />
                  <Route path="/agenda" component={Agenda} />
                  <Route path="/financial">
                    <RoleProtectedRoute component={Financial} allowedRoles={['admin']} />
                  </Route>
                  <Route path="/inventory">
                    <RoleProtectedRoute component={Inventory} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/purchases">
                    <RoleProtectedRoute component={Purchases} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/reports">
                    <RoleProtectedRoute component={Reports} allowedRoles={['admin', 'secretaria']} />
                  </Route>
                  <Route path="/settings">
                    <RoleProtectedRoute component={Settings} allowedRoles={['admin', 'secretaria']} />
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
