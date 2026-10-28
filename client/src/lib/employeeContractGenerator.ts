import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Employee } from "@shared/schema";

if (pdfMake && pdfFonts) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;
}

export function generateEmployeeContract(employee: Employee) {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const address = [
    employee.rua ? `${employee.rua}` : '',
    employee.numero ? `nº ${employee.numero}` : '',
    employee.bairro ? `Bairro ${employee.bairro}` : '',
    employee.cidade && employee.estado ? `${employee.cidade}/${employee.estado}` : (employee.cidade || employee.estado || ''),
    employee.cep ? `CEP: ${employee.cep}` : '',
  ].filter(Boolean).join(", ") || "Endereço não informado";

  const pixInfo = employee.pixKey
    ? `${employee.pixKey}${employee.pixType ? ` (${employee.pixType.toUpperCase()})` : ''}`
    : "Não cadastrada";

  const docDefinition: any = {
    content: [
      {
        text: "BOLZONI PRODUÇÕES ARTÍSTICAS",
        style: "headerCompany",
        alignment: "center",
      },
      {
        text: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS EVENTUAIS / ARTÍSTICOS",
        style: "title",
        alignment: "center",
        margin: [0, 5, 0, 20],
      },

      {
        text: [
          { text: "CONTRATANTE: ", bold: true },
          "BOLZONI PRODUÇÕES ARTÍSTICAS, empresa especializada em produção de eventos infantis, recreação, espetáculos teatrais e personagens vivos.\n\n",
          { text: "CONTRATADO(A): ", bold: true },
          `${employee.name.toUpperCase()}, `,
          employee.role ? `função principal: ${employee.role}, ` : "",
          employee.cpf ? `inscrito(a) no CPF sob o nº ${employee.cpf}, ` : "",
          employee.rg ? `portador(a) do RG nº ${employee.rg}, ` : "",
          `residente e domiciliado(a) em: ${address}.\n`,
          { text: "DADOS BANCÁRIOS / CHAVE PIX: ", bold: true },
          `${pixInfo}.\n`,
        ],
        style: "partyText",
        margin: [0, 0, 0, 15],
      },

      {
        text: "As partes acima qualificadas têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços Eventuais, que se regerá pelas seguintes cláusulas e condições:",
        style: "clauseText",
        margin: [0, 0, 0, 12],
      },

      {
        text: "CLÁUSULA PRIMEIRA – DO OBJETO",
        style: "clauseTitle",
      },
      {
        text: `O presente contrato tem como objeto a prestação de serviços eventuais pelo(a) CONTRATADO(A) em eventos, festas, espetáculos e ações organizadas pela CONTRATANTE, atuando conforme sua escala em funções de: ${employee.role || "atuação artística, recreação, animação ou produção técnica"}.`,
        style: "clauseText",
      },

      {
        text: "CLÁUSULA SEGUNDA – DA NATUREZA DOS SERVIÇOS E AUSÊNCIA DE VÍNCULO EMPREGATÍCIO",
        style: "clauseTitle",
      },
      {
        text: "A prestação de serviços ora pactuada é de natureza estritamente autônoma, eventual e sem exclusividade, não gerando qualquer vínculo de emprego, subordinação jurídica permanente ou obrigações trabalhistas e previdenciárias de natureza celetista entre as partes, conforme permissivo legal (Lei nº 13.429/2017 e Código Civil Brasileiro, arts. 593 e seguintes).",
        style: "clauseText",
      },

      {
        text: "CLÁUSULA TERCEIRA – DA PONTUALIDADE E COMPROMISSO",
        style: "clauseTitle",
      },
      {
        text: "O(A) CONTRATADO(A) compromete-se a comparecer com antecedência mínima de 1 (uma) hora ao local do evento previamente combinado, devidamente alimentado(a), com higiene pessoal adequada e pronto(a) para a preparação, troca de figurino e maquiagem.",
        style: "clauseText",
      },

      {
        text: "CLÁUSULA QUARTA – DOS FIGURINOS E MATERIAIS DE CENA",
        style: "clauseTitle",
      },
      {
        text: "A CONTRATANTE fornecerá os figurinos, adereços e materiais necessários para a realização do trabalho. O(A) CONTRATADO(A) se obriga a zelar pela conservação, limpeza e integridade de todos os itens disponibilizados, respondendo civilmente por danos causados por negligência ou mau uso comprovado.",
        style: "clauseText",
      },

      {
        text: "CLÁUSULA QUINTA – DO CACHÊ E FORMA DE PAGAMENTO",
        style: "clauseTitle",
      },
      {
        text: `Pelos serviços efetivamente prestados em cada evento, a CONTRATANTE efetuará o pagamento do cachê previamente acordado na escala, mediante transferência bancária ou PIX para a chave cadastrada (${pixInfo}), nos prazos estipulados no fechamento operacional da empresa.`,
        style: "clauseText",
      },

      {
        text: "CLÁUSULA SEXTA – DA CESSÃO DE DIREITOS DE IMAGEM E VOZ",
        style: "clauseTitle",
      },
      {
        text: "O(A) CONTRATADO(A) autoriza expressamente a CONTRATANTE a captar, utilizar e veicular sua imagem e voz em fotografias, gravações em vídeo e materiais promocionais obtidos durante os eventos e apresentações, exclusivamente para fins de divulgação institucional em redes sociais, website e portfólio da Bolzoni Produções, a título gratuito e por prazo indeterminado.",
        style: "clauseText",
      },

      {
        text: "CLÁUSULA SÉTIMA – DA CONFIDENCIALIDADE E CONDUTA ÉTICA",
        style: "clauseTitle",
      },
      {
        text: "O(A) CONTRATADO(A) compromete-se a manter sigilo sobre clientes, valores de contratos, locais de eventos e rotinas internas da CONTRATANTE, mantendo conduta exemplar de respeito, empatia e profissionalismo, sendo vedado solicitar ou aceitar serviços particulares diretamente dos clientes da CONTRATANTE.",
        style: "clauseText",
      },

      {
        text: "CLÁUSULA OITAVA – DO FORO",
        style: "clauseTitle",
      },
      {
        text: "Para dirimir eventuais controvérsias oriundas do presente instrumento, as partes elegem o foro da Comarca de domicílio da CONTRATANTE, com renúncia a qualquer outro, por mais privilegiado que seja.",
        style: "clauseText",
        margin: [0, 0, 0, 25],
      },

      {
        text: `São Paulo / Localidade, ${currentDate}.`,
        alignment: "center",
        margin: [0, 0, 0, 40],
      },

      {
        columns: [
          {
            text: "_____________________________________\nBOLZONI PRODUÇÕES ARTÍSTICAS\nContratante",
            alignment: "center",
          },
          {
            text: `_____________________________________\n${employee.name.toUpperCase()}\nContratado(a)`,
            alignment: "center",
          },
        ],
      },
    ],
    styles: {
      headerCompany: {
        fontSize: 16,
        bold: true,
        color: "#c026d3", // Magenta / Primary color
      },
      title: {
        fontSize: 12,
        bold: true,
        color: "#1e293b",
      },
      partyText: {
        fontSize: 10,
        lineHeight: 1.3,
        color: "#334155",
      },
      clauseTitle: {
        fontSize: 10,
        bold: true,
        color: "#0f172a",
        margin: [0, 8, 0, 3],
      },
      clauseText: {
        fontSize: 9.5,
        alignment: "justify",
        lineHeight: 1.35,
        color: "#334155",
        margin: [0, 0, 0, 6],
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  pdfMake.createPdf(docDefinition).open();
}
