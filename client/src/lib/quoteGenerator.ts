import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteFormValues } from "@/components/quote-dialog";
import { formatLocalDate } from "./date-utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

if (pdfMake && pdfFonts) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;
}

export function generateQuotePDF(data: QuoteFormValues & { totalValue: number, totalCosts: number }) {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // crosses midnight
    return parseFloat((diff / 60).toFixed(2));
  };

  const scheduleListBody = [
    [
      { text: 'Data', style: 'tableHeader' },
      { text: 'Período', style: 'tableHeader' },
      { text: 'Horário', style: 'tableHeader' },
      { text: 'Local', style: 'tableHeader' },
      { text: 'Duração', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  const validSchedule = (data.schedule || []).filter((s: any) => s.date || s.startTime || s.location);
  if (validSchedule.length > 0) {
    validSchedule.forEach((s: any) => {
      const hours = calculateDuration(s.startTime, s.endTime);
      scheduleListBody.push([
        { text: formatLocalDate(s.date) || "A definir", margin: [0, 2, 0, 2] } as any,
        { text: s.period.charAt(0).toUpperCase() + s.period.slice(1), margin: [0, 2, 0, 2] } as any,
        { text: (s.startTime && s.endTime) ? `${s.startTime} às ${s.endTime}` : (s.startTime || "-"), margin: [0, 2, 0, 2] } as any,
        { text: s.location || "-", margin: [0, 2, 0, 2] } as any,
        { text: hours > 0 ? `${hours}h` : "-", alignment: 'center', margin: [0, 2, 0, 2] } as any
      ]);
    });
  } else {
    scheduleListBody.push([
      { text: "Data a definir", margin: [0, 2, 0, 2] } as any,
      { text: "-", margin: [0, 2, 0, 2] } as any,
      { text: "-", margin: [0, 2, 0, 2] } as any,
      { text: "-", margin: [0, 2, 0, 2] } as any,
      { text: "-", alignment: 'center', margin: [0, 2, 0, 2] } as any
    ]);
  }

  const eventTypes: Record<string, string> = {
    aniversario: "Aniversário",
    "15anos": "15 Anos",
    casamento: "Casamento",
    inauguracao: "Inauguração",
    corporativo: "Corporativo",
    espetaculo: "Espetáculo",
    outro: "Outro"
  };

  const charactersListBody = [
    [
      { text: 'Item / Descrição', style: 'tableHeader' },
      { text: 'Qtd.', style: 'tableHeader', alignment: 'center' }
    ]
  ];

  // Add characters to the proposal
  const validCharacters = data.characters.filter((c: any) => c.name.trim() !== "");
  
  if (validCharacters.length > 0) {
    validCharacters.forEach((char: any) => {
      charactersListBody.push([
        {
          text: char.name,
          margin: [0, 5, 0, 5]
        } as any,
        { 
          text: char.quantity ? char.quantity.toString() : "1", 
          alignment: 'center',
          margin: [0, 5, 0, 5]
        } as any
      ]);
    });
  } else {
    charactersListBody.push([
      {
        text: "Serviço de produção / evento geral (sem personagens específicos descritos)",
        margin: [0, 5, 0, 5]
      } as any,
      { 
        text: "-", 
        alignment: 'center',
        margin: [0, 5, 0, 5]
      } as any
    ]);
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        text: 'PROPOSTA DE ORÇAMENTO',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 5]
      },
      {
        text: 'Bolzoni Produções e Entretenimento',
        alignment: 'center',
        color: '#666666',
        margin: [0, 0, 0, 30]
      },
      {
        columns: [
          {
            width: '*',
            text: [
              { text: 'DADOS DO EVENTO\n', style: 'sectionTitle' },
              { text: 'Cliente: ', bold: true }, `${data.clientName}\n`,
              { text: 'Tipo de Evento: ', bold: true }, `${eventTypes[data.eventType] || 'Não informado'}\n`,
            ]
          },
          {
            width: 'auto',
            text: [
              { text: `Data do Orçamento: ${currentDate}`, fontSize: 9, color: '#666666', alignment: 'right' }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'CRONOGRAMA DO EVENTO',
        style: 'sectionTitle',
        margin: [0, 10, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*', 'auto'],
          body: scheduleListBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DESCRIÇÃO DOS SERVIÇOS',
        style: 'sectionTitle',
        margin: [0, 10, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60],
          body: charactersListBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 250,
            table: {
              widths: ['*', '*'],
              body: [
                ...(data.discountPercentage > 0 ? [
                  [
                    { text: 'SUBTOTAL:', fontSize: 11, border: [false, false, false, false], margin: [0, 2, 0, 2] },
                    { text: formatCurrency(data.totalCosts + (data.totalCosts * (data.profitMargin / 100))), fontSize: 11, alignment: 'right', border: [false, false, false, false], margin: [0, 2, 0, 2] }
                  ] as any,
                  [
                    { text: `DESCONTO (${data.discountPercentage}%):`, fontSize: 11, color: '#ef4444', border: [false, false, false, false], margin: [0, 2, 0, 5] },
                    { text: `-${formatCurrency((data.totalCosts + (data.totalCosts * (data.profitMargin / 100))) * (data.discountPercentage / 100))}`, fontSize: 11, color: '#ef4444', alignment: 'right', border: [false, false, false, false], margin: [0, 2, 0, 5] }
                  ] as any
                ] : []),
                [
                  { text: 'VALOR DO PACOTE:', bold: true, fontSize: 14, border: [false, data.discountPercentage > 0, false, false], margin: [0, 5, 0, 5] },
                  { text: formatCurrency(data.totalValue), bold: true, fontSize: 14, alignment: 'right', border: [false, data.discountPercentage > 0, false, false], margin: [0, 5, 0, 5] }
                ]
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ],
        margin: [0, 10, 0, 40]
      },
      {
        text: 'Condições Gerais do Orçamento:\n',
        bold: true,
        fontSize: 10,
        margin: [0, 0, 0, 5]
      },
      {
        text: '1. Este orçamento é uma estimativa de custos e não garante reserva de data.\n2. Valores sujeitos a alteração sem aviso prévio caso o contrato não seja fechado no prazo de 7 dias.\n3. A contratação só é efetivada mediante assinatura do contrato e pagamento do sinal (mínimo de 30%).\n4. Não estão inclusos neste orçamento valores de deslocamento/frete caso não tenha sido acordado com o contratante.',
        fontSize: 9,
        color: '#666666',
        margin: [0, 0, 0, 0]
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#2C3E50'
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: '#2C3E50',
        margin: [0, 0, 0, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 11,
        color: '#2C3E50',
        fillColor: '#F8FAFC',
        margin: [0, 5, 0, 5]
      }
    },
    defaultStyle: {
      fontSize: 11,
      color: '#333333'
    }
  };

  (pdfMake as any).createPdf(docDefinition).download(`Orcamento-${data.clientName.replace(/\s+/g, '-')}.pdf`);
}
