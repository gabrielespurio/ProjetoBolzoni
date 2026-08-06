import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, FileText, Pencil, Trash2, CalendarPlus, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QuoteDialog } from "@/components/quote-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatLocalDate } from "@/lib/date-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateQuotePDF } from "@/lib/quoteGenerator";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function Quotes() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: quotes, isLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Orçamento excluído",
        description: "O orçamento foi removido com sucesso.",
      });
      setQuoteToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o orçamento.",
        variant: "destructive",
      });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/quotes/${id}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Orçamento convertido!",
        description: "O orçamento foi transformado em evento na agenda com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao converter",
        description: error.message || "Não foi possível converter o orçamento.",
        variant: "destructive",
      });
    },
  });


  const handleOpenDialog = (quote?: any) => {
    setSelectedQuote(quote || null);
    setIsDialogOpen(true);
  };

  const handleDuplicateQuote = (quote: any) => {
    const duplicatedQuote = {
      ...quote,
      id: undefined, 
      status: "draft",
      clientName: `${quote.clientName} (Cópia)`,
    };
    setSelectedQuote(duplicatedQuote);
    setIsDialogOpen(true);
  };

  const handleDownloadPDF = (quote: any) => {
    generateQuotePDF({
      ...quote,
      scope: quote.details?.scope || {},
      costs: quote.details?.costs || {},
      characters: quote.details?.characters || [],
      totalCosts: parseFloat(quote.totalCosts || "0"),
      totalValue: parseFloat(quote.totalValue),
    });
  };

  const filteredQuotes = quotes?.filter((quote) =>
    quote.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#6C5584]">Orçamentos</h2>
          <p className="text-muted-foreground mt-1">Gerencie propostas e orçamentos de eventos.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#6C5584] hover:bg-[#5d4872]">
          <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg text-[#6C5584] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Orçamentos
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-[#6C5584]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Data / Tipo</th>
                  <th className="px-6 py-4 font-semibold">Personagens</th>
                  <th className="px-6 py-4 font-semibold text-right">Valor Total</th>
                  <th className="px-6 py-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-[150px]" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-[100px]" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-[80px]" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-[100px] ml-auto" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-8 w-[120px] mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredQuotes?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Nenhum orçamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes?.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{quote.clientName}</span>
                          {quote.status === "approved" && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] py-0.5 px-2 hover:bg-emerald-100 font-normal">
                              Aprovado
                            </Badge>
                          )}
                          {quote.status === "draft" && (
                            <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px] py-0.5 px-2 hover:bg-gray-100 font-normal">
                              Rascunho
                            </Badge>
                          )}
                          {quote.status === "sent" && (
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] py-0.5 px-2 hover:bg-blue-100 font-normal">
                              Enviado
                            </Badge>
                          )}
                          {quote.status === "rejected" && (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] py-0.5 px-2 hover:bg-red-100 font-normal">
                              Rejeitado
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">
                            {formatLocalDate(quote.eventDate) || "A definir"}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {quote.eventType === '15anos' ? '15 Anos' : quote.eventType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                          {quote.details?.characters?.length || 0}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-primary">
                        {formatCurrency(parseFloat(quote.totalValue))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {quote.status !== "approved" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => convertMutation.mutate(quote.id)}
                              disabled={convertMutation.isPending}
                              className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              title="Converter em Evento"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDownloadPDF(quote)}
                            className="h-8 border-primary/20 text-primary hover:bg-primary/10"
                            title="Baixar PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDuplicateQuote(quote)}
                            className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                            title="Duplicar Orçamento"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenDialog(quote)}
                            className="h-8 hover:bg-gray-100"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setQuoteToDelete(quote.id)}
                            className="h-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <QuoteDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        quote={selectedQuote} 
      />

      <AlertDialog open={!!quoteToDelete} onOpenChange={() => setQuoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => quoteToDelete && deleteMutation.mutate(quoteToDelete)}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
