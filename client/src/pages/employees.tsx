import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Briefcase, MapPin, CreditCard } from "lucide-react";
import { EmployeeDialog } from "@/components/employee-dialog";
import { DateFilter, type DateFilterValue } from "@/components/date-filter";
import { filterByDateRange } from "@/lib/date-utils";
import type { Employee } from "@shared/schema";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    preset: "custom",
    range: undefined,
  });

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const filteredEmployees = useMemo(() => {
    let result = employees || [];
    
    result = filterByDateRange(result, "createdAt", dateFilter);
    
    result = result.filter((employee) =>
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.role.toLowerCase().includes(search.toLowerCase()) ||
      employee.phone?.includes(search) ||
      employee.email?.toLowerCase().includes(search.toLowerCase()) ||
      employee.cpf?.includes(search) ||
      employee.cidade?.toLowerCase().includes(search.toLowerCase())
    );
    
    return result;
  }, [employees, search, dateFilter]);

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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Funcionários</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gerencie a equipe da Bolzoni Produções
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-employee" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Funcionário
        </Button>
      </div>

      <Card className="border-card-border">
        <CardHeader className="border-b border-border p-3 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-employees"
              />
            </div>
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 md:space-y-4 p-3 md:p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 md:h-24 w-full" />
              ))}
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="p-3 md:p-6 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleEdit(employee)}
                  data-testid={`employee-${employee.id}`}
                >
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-foreground truncate">{employee.name}</h3>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs md:text-sm text-muted-foreground truncate">{employee.role}</span>
                        </div>
                      </div>
                      <Badge variant={employee.isAvailable ? "default" : "secondary"} className="flex-shrink-0">
                        {employee.isAvailable ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                    <div className="grid gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2">
                      {employee.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{employee.phone}</span>
                        </div>
                      )}
                      {employee.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                      {employee.cpf && (
                        <div className="flex items-center gap-2 hidden sm:flex">
                          <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">{employee.cpf}</span>
                        </div>
                      )}
                      {(employee.cidade || employee.estado) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate">
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
            <div className="p-8 md:p-12 text-center">
              <p className="text-xs md:text-sm text-muted-foreground">
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
