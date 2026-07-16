import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Request, Response } from "express";
import { storage } from "./storage";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const systemInstruction = `Você é um assistente virtual do sistema de gestão Bolzoni Produções.
Sua personalidade é amigável, formal e proativa.
Você DEVE basear suas respostas nas regras e módulos reais do sistema Bolzoni Produções, detalhados abaixo:

MÓDULOS DO SISTEMA:
1. Dashboard: Visão geral com métricas, saldo em caixa, próximos eventos e pendências financeiras.
2. Eventos: Gerencia eventos. Possuem status, personagens, funcionários alocados, pagamentos e despesas. Integra com Google Calendar.
3. Agenda: Visão de calendário dos eventos.
4. Orçamentos: Para criar um orçamento, o usuário deve ir no menu lateral em "Orçamentos" e clicar no botão "+ Novo Orçamento" no canto superior direito. Deve preencher Cliente, Tipo de Evento, Data, Personagens e Serviços. O sistema calcula o "Valor Total" automaticamente (base + personagens + KM + taxas). O orçamento gerado pode ser baixado em PDF ou editado na própria tabela.
5. Clientes: Cadastro de clientes.
6. Buffets: Locais de eventos cadastrados.
7. Funcionários: Cadastro da equipe, com valor do cachê e habilidades (quais personagens fazem).
8. Depto. Pessoal: Controle de pagamentos de cachês.
9. Estoque: Controle de materiais e fantasias.
10. Financeiro: Transações de fluxo de caixa (receitas e despesas).
11. Compras: Pedidos de compra.
12. Configurações: Cadastro de pacotes, valor de KM, taxas de cartão, etc.

REGRAS DE RESPOSTA E AÇÕES:
- Você POSSUI PERMISSÃO para criar orçamentos e eventos no sistema usando suas ferramentas (Functions).
- ANTES de chamar qualquer função para criar algo, você DEVE gerar um resumo dos dados que coletou e PERGUNTAR explicitamente ao usuário se ele confirma a criação.
- SÓ CHAME A FUNÇÃO após o usuário responder confirmando (ex: "sim", "pode criar", "ok").
- Para criar um evento, você precisa de um Cliente. Se o usuário não fornecer, crie um cliente com os dados fornecidos e depois crie o evento.
- Quando ensinarem a fazer algo, seja direto e use os termos corretos da interface. Ex: "No menu lateral, clique em Orçamentos e depois no botão + Novo Orçamento...".
- Não invente botões ou campos que não existam.
- Formate a resposta usando Markdown de forma clara: use negrito para nomes de botões, listas (bullet points) para o passo a passo, e parágrafos curtos.
- Se o usuário enviar uma imagem, interprete o contexto.`;

export async function handleChat(req: Request, res: Response) {
  try {
    const { history, message, attachment } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: "Chave da API do Gemini não configurada." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }]
      },
      tools: [{
        functionDeclarations: [
          {
            name: "create_quote",
            description: "Cria um novo orçamento no sistema.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                clientName: { type: SchemaType.STRING, description: "Nome do cliente" },
                eventType: { type: SchemaType.STRING, description: "Tipo de evento (ex: 15anos, casamento, infantil)" },
                eventDate: { type: SchemaType.STRING, description: "Data do evento no formato YYYY-MM-DD" },
                totalValue: { type: SchemaType.NUMBER, description: "Valor total do orçamento em números" }
              },
              required: ["clientName", "eventType", "totalValue"]
            }
          },
          {
            name: "create_event",
            description: "Cria um novo evento no sistema. Esta função também cadastra o cliente automaticamente.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                clientName: { type: SchemaType.STRING, description: "Nome do cliente" },
                clientPhone: { type: SchemaType.STRING, description: "Telefone do cliente (opcional)" },
                title: { type: SchemaType.STRING, description: "Título do evento" },
                date: { type: SchemaType.STRING, description: "Data do evento no formato YYYY-MM-DD" },
                contractValue: { type: SchemaType.NUMBER, description: "Valor do contrato em números" }
              },
              required: ["clientName", "title", "date", "contractValue"]
            }
          },
          {
            name: "search_quotes",
            description: "Busca orçamentos pelo nome do cliente.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                clientName: { type: SchemaType.STRING, description: "Nome do cliente para buscar orçamentos" }
              },
              required: ["clientName"]
            }
          },
          {
            name: "convert_quote_to_event",
            description: "Transforma um orçamento existente em um evento.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                quoteId: { type: SchemaType.STRING, description: "ID do orçamento" },
                title: { type: SchemaType.STRING, description: "Título do novo evento" }
              },
              required: ["quoteId", "title"]
            }
          }
        ]
      }]
    });

    let chatHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // A API do Gemini exige que o histórico comece com 'user' e alterne entre 'user' e 'model'.
    // Vamos remover mensagens iniciais do assistente se houver.
    while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
      chatHistory.shift();
    }

    const chat = model.startChat({
      history: chatHistory,
    });

    const parts: any[] = [];
    if (message) {
      parts.push({ text: message });
    }

    if (attachment) {
      parts.push({
        inlineData: {
          data: attachment.data,
          mimeType: attachment.mimeType
        }
      });
    }

    if (parts.length === 0) {
      return res.status(400).json({ error: "Mensagem ou anexo é obrigatório." });
    }

    const result = await chat.sendMessage(parts);
    const call = result.response.functionCalls()?.[0];

    if (call) {
      console.log("Chamada de função detectada:", call.name, call.args);
      let apiResponse = {};
      const args = call.args as Record<string, any>;
      try {
        if (call.name === "create_quote") {
          const { clientName, eventType, eventDate, totalValue } = args;
          const newQuote = await storage.createQuote({
            clientName: clientName as string,
            eventType: eventType as string,
            totalValue: String(totalValue),
            eventDate: eventDate ? new Date(eventDate as string) : null,
            characters: [],
            status: "draft"
          } as any);
          apiResponse = { success: true, message: "Orçamento criado com sucesso!", quoteId: newQuote.id };
        } else if (call.name === "create_event") {
          const { clientName, clientPhone, title, date, contractValue } = args;
          
          // Cria o cliente primeiro
          const newClient = await storage.createClient({
            name: clientName as string,
            phone: (clientPhone as string) || null,
            personType: "fisica"
          } as any);

          // Cria o evento
          const newEvent = await storage.createEvent({
            clientId: newClient.id,
            title: title as string,
            date: new Date(date as string),
            contractValue: String(contractValue),
            status: "scheduled",
            eventType: "service"
          } as any);
          
          apiResponse = { success: true, message: "Cliente e Evento criados com sucesso!", eventId: newEvent.id };
        } else if (call.name === "search_quotes") {
          const { clientName } = args;
          const quotes = await storage.getAllQuotes();
          const filtered = quotes.filter(q => q.clientName.toLowerCase().includes((clientName as string).toLowerCase()));
          apiResponse = { success: true, quotes: filtered.map(q => ({ id: q.id, clientName: q.clientName, eventType: q.eventType, totalValue: q.totalValue, date: q.eventDate })) };
        } else if (call.name === "convert_quote_to_event") {
          const { quoteId, title } = args;
          const quote = await storage.getQuote(quoteId as string);
          if (!quote) throw new Error("Orçamento não encontrado.");

          // Cria cliente com nome do orçamento
          const newClient = await storage.createClient({ name: quote.clientName, personType: "fisica" } as any);
          
          // Cria evento baseado no orçamento
          const newEvent = await storage.createEvent({
            clientId: newClient.id,
            title: title as string,
            date: quote.eventDate ? new Date(quote.eventDate) : new Date(),
            contractValue: quote.totalValue,
            status: "scheduled",
            eventType: quote.eventType
          } as any);

          // Atualiza o orçamento para aprovado
          await storage.updateQuote(quote.id, { status: "approved" });

          apiResponse = { success: true, message: "Orçamento transformado em Evento com sucesso!", eventId: newEvent.id };
        } else {
          apiResponse = { success: false, error: "Função desconhecida." };
        }
      } catch (err: any) {
        console.error("Erro ao executar função:", err);
        apiResponse = { success: false, error: err.message };
      }

      const functionResponseResult = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: apiResponse
        }
      }]);
      res.json({ reply: functionResponseResult.response.text() });
    } else {
      res.json({ reply: result.response.text() });
    }
  } catch (error: any) {
    console.error("Erro no chat do Gemini:", error);
    if (error?.status === 503 || error?.message?.includes('503')) {
      res.status(503).json({ error: "A inteligência artificial do Google está temporariamente sobrecarregada. Por favor, aguarde alguns instantes e tente novamente." });
    } else if (error?.status === 429 || error?.message?.includes('429')) {
      res.status(429).json({ error: "O limite de uso gratuito da API do Google foi atingido temporariamente. Por favor, aguarde cerca de 1 minuto e tente novamente." });
    } else {
      res.status(500).json({ error: "Erro ao processar a requisição com o assistente." });
    }
  }
}
