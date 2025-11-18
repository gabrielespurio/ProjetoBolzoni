import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Briefcase, MapPin, CreditCard } from "lucide-react";
import { EmployeeDialog } from "@/components/employee-dialog";
import type { Employee } from "@shared/schema";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const filteredEmployees = employees?.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase()) ||
    employee.role.toLowerCase().includes(search.toLowerCase()) ||
    employee.phone?.includes(search) ||
    employee.email?.toLowerCase().includes(search.toLowerCase()) ||
    employee.cpf?.includes(search) ||
    employee.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Funcionários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a equipe da Bolzoni Produções
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-employee">
          <Plus className="mr-2 h-4 w-4" />
          Novo Funcionário
        </Button>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, função, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-employees"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleEdit(employee)}
                  data-testid={`employee-${employee.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">{employee.name}</h3>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{employee.role}</span>
                        </div>
                      </div>
                      <Badge variant={employee.isAvailable ? "default" : "secondary"}>
                        {employee.isAvailable ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      {employee.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      {employee.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                      {employee.cpf && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{employee.cpf}</span>
                        </div>
                      )}
                      {(employee.cidade || employee.estado) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {employee.cidade && employee.estado 
                              ? `${employee.cidade} - ${employee.estado}`
                              : employee.cidade || employee.estado}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog
        open={isDialogOpen}
        onClose={handleClose}
        employee={selectedEmployee}
      />
    </div>
  );
}
