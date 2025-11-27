import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

if (pdfMake && pdfFonts) {
  (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
}

interface ContractData {
  eventTitle: string;
  clientName: string;
  clientPersonType?: "fisica" | "juridica";
  clientCnpj?: string;
  clientCpf?: string;
  clientRg?: string;
  clientPhone?: string;
  clientRua?: string;
  clientNumero?: string;
  clientBairro?: string;
  clientCidade?: string;
  clientEstado?: string;
  eventDate: Date;
  eventTime: string;
  location: string;
  contractValue: string;
  package: string;
  characters: string[];
  estimatedChildren: number;
}

export function generateContract(data: ContractData) {
  const formattedDate = format(new Date(data.eventDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const contractDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    content: [
      {
        text: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE RECREAÇÃO E PERSONAGENS PARA FESTA INFANTIL',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      {
        text: 'IDENTIFICAÇÃO DAS PARTES CONTRATANTES',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: data.clientPersonType === "juridica" 
          ? [
              { text: 'CONTRATANTE: ', bold: true },
              `${data.clientName}`,
              data.clientCnpj ? `, inscrita no CNPJ sob nº ${data.clientCnpj}` : '',
              data.clientRua ? `, com sede à ${data.clientRua}` : '',
              data.clientNumero ? `, nº ${data.clientNumero}` : '',
              data.clientBairro ? `, ${data.clientBairro}` : '',
              data.clientCidade ? `, ${data.clientCidade}` : '',
              data.clientEstado ? `/${data.clientEstado}` : '',
              data.clientPhone ? `, telefone: ${data.clientPhone}` : '',
              '.'
            ]
          : [
              { text: 'CONTRATANTE: ', bold: true },
              `${data.clientName}`,
              data.clientCpf ? `, CPF: ${data.clientCpf}` : '',
              data.clientRg ? `, RG: ${data.clientRg}` : '',
              data.clientRua ? `, residente à ${data.clientRua}` : '',
              data.clientNumero ? `, nº ${data.clientNumero}` : '',
              data.clientBairro ? `, ${data.clientBairro}` : '',
              data.clientCidade ? `, ${data.clientCidade}` : '',
              data.clientEstado ? `/${data.clientEstado}` : '',
              data.clientPhone ? `, telefone: ${data.clientPhone}` : '',
              '.'
            ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'CONTRATADA: ', bold: true },
          'Beatriz Bolzoni Floriano, brasileira, empresária individual, inscrita no CNPJ sob nº 42.508.153/0001-94, com sede à Rua Carlos Medeiros Doria, nº 209, Jardim Viena, São José do Rio Preto/SP, e-mail: mundoencantadoproducoes@gmail.com, telefone: (17) 99725-2950.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'OBJETO DO CONTRATO',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 1-A. ', bold: true },
          `O presente contrato refere-se ao ${data.package || 'Pacote Colors'}, conforme condições previamente acordadas entre as partes.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: 'Estão inclusos no pacote os seguintes serviços:',
        margin: [0, 0, 0, 5]
      },
      {
        ul: [
          `${data.characters.length} personage${data.characters.length > 1 ? 'ns caracterizados' : 'm caracterizado'}: ${data.characters.join(', ')};`,
          'Apresentação musical temática com ambientação sonora;',
          'Dança e interação com as crianças ao longo do evento;',
          'Pintura artística e escultura em bexiga realizadas pelos produtores;',
          'Retomada do entretenimento e condução do momento do parabéns;',
          'Acompanhamento por produtores para suporte técnico e organizacional durante toda a festa;'
        ],
        margin: [20, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 2º. ', bold: true },
          'Eventuais danos materiais causados por crianças ou terceiros são de exclusiva responsabilidade do CONTRATANTE, que se compromete a providenciar a substituição por itens de qualidade igual ou superior.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DA FESTA',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 2ª. ', bold: true },
          `A festa será realizada em ${formattedDate}, às ${data.eventTime}, em ${data.location}.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo único. ', bold: true },
          'O CONTRATANTE declara a veracidade do endereço informado, isentando a CONTRATADA de responsabilidade por atrasos ou impossibilidade de execução decorrentes de informações incorretas.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 3ª. ', bold: true },
          'O serviço de recreação terá início e término conforme horário acordado entre as partes.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 1º. ', bold: true },
          'Atrasos por parte do CONTRATANTE não acarretarão prorrogação do serviço. Caso o atraso seja da CONTRATADA, esta deverá compensar o tempo com acréscimo de até 15 minutos ao final do evento.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 2º. ', bold: true },
          'Alterações de data ou horário devem ser comunicadas com antecedência mínima de 30 (trinta) dias úteis, ficando sujeitas à disponibilidade da CONTRATADA.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 4ª. ', bold: true },
          'A prorrogação do horário contratado será cobrada à parte, no valor de R$90,00 (noventa reais) por animador a cada 30 minutos adicionais.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 5ª. ', bold: true },
          `Estima-se participação de ${data.estimatedChildren || 15} (${numberToWords(data.estimatedChildren || 15)}) crianças. Caso o número exceda, será cobrado adicional de R$ 10,00 (dez reais) por criança.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo único. ', bold: true },
          'O CONTRATANTE compromete-se a informar alterações no número de crianças com no mínimo 10 (dez) dias de antecedência. O não cumprimento poderá comprometer a qualidade dos serviços prestados.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DAS OBRIGAÇÕES DO CONTRATANTE',
        style: 'sectionHeader',
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 6ª. ', bold: true },
          'É responsabilidade do CONTRATANTE assegurar à CONTRATADA:'
        ],
        margin: [0, 0, 0, 5]
      },
      {
        ul: [
          'Disponibilidade de energia elétrica e iluminação adequadas;',
          'Espaço físico apropriado para a realização das atividades recreativas;',
          'Sistema de som profissional para reprodução das músicas, as quais serão fornecidas pela CONTRATADA em pen drive, celular ou dispositivo similar.'
        ],
        margin: [20, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo único. ', bold: true },
          'A CONTRATADA não se responsabiliza por falhas, incompatibilidades ou ausência da estrutura de som no local.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 7ª. ', bold: true },
          'Para eventos com deslocamento superior a 2 (duas) horas por trecho, o CONTRATANTE deverá providenciar:'
        ],
        margin: [0, 0, 0, 5]
      },
      {
        ul: [
          'Camarim exclusivo com banheiro;',
          'Espaço reservado para descanso do motorista.'
        ],
        margin: [20, 0, 0, 5]
      },
      {
        text: 'Caso tais estruturas não estejam disponíveis, será cobrada taxa adicional no valor de R$500,00 (quinhentos reais), referente à hospedagem.',
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 8ª. ', bold: true },
          'O CONTRATANTE deverá fornecer água, refrigerantes, alimentos disponíveis no evento, bem como mesa e cadeiras necessárias para uso da equipe.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 9ª. ', bold: true },
          'Para eventos realizados em condomínios ou locais com portaria, o CONTRATANTE compromete-se a providenciar autorização prévia para acesso da equipe da CONTRATADA.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 10ª. ', bold: true },
          'O CONTRATANTE autoriza, gratuitamente, a utilização de imagens captadas durante o evento para fins institucionais, promocionais e divulgação em mídias digitais e portfólio da CONTRATADA.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DAS OBRIGAÇÕES DA CONTRATADA',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 11ª. ', bold: true },
          'A CONTRATADA compromete-se a executar as atividades contratadas de forma diligente e dentro dos prazos acordados. Caso não ocorra a prestação integral do serviço por motivos não justificados, deverá ressarcir o valor proporcional.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 12ª. ', bold: true },
          'A CONTRATADA não se responsabiliza pela segurança das crianças durante o evento, cabendo aos pais ou responsáveis a supervisão e cuidado necessários.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'VALORES E CONDIÇÕES DE PAGAMENTO',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 13ª. ', bold: true },
          `O valor total dos serviços é de ${data.contractValue}, sendo pago o valor mínimo de 30% do valor do contrato como entrada.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 1º. ', bold: true },
          'Pagamentos inferiores a 30% (trinta por cento) não garantem a reserva da data. Em caso de cancelamento, o CONTRATANTE deverá complementar o valor de entrada como multa.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 2º. ', bold: true },
          'O saldo remanescente deverá ser quitado até 5 (cinco) dias antes da data do evento.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 3º. ', bold: true },
          'Em caso de pagamento parcelado, o reembolso, se aplicável, será realizado somente após quitação total, descontando-se as taxas administrativas e a multa correspondente a 50%.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo 4º. ', bold: true },
          'Caso o CONTRATANTE tenha contratado dois personagens e deseje reduzir para um, o valor originalmente contratado será mantido integralmente.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'REMARCAÇÃO E CANCELAMENTO',
        style: 'sectionHeader',
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 14ª. ', bold: true },
          'Solicitações de remarcação deverão ser feitas com antecedência mínima de 20 (vinte) dias, sendo permitida apenas uma remarcação, condicionada à disponibilidade da CONTRATADA. Remarcações solicitadas após esse prazo estarão sujeitas à cobrança de multa equivalente a 50% (cinquenta por cento) do valor total do contrato.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 15ª. ', bold: true },
          'Em caso de desistência pelo CONTRATANTE:'
        ],
        margin: [0, 0, 0, 5]
      },
      {
        ul: [
          'Com antecedência superior a 15 (quinze) dias: retenção de 30% do valor total;',
          'Com menos de 5 (cinco) dias úteis: cobrança integral do contrato.'
        ],
        margin: [20, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 16ª. ', bold: true },
          'Para eventos ao ar livre, em caso de chuva ou condições climáticas adversas que impossibilitem a realização, o CONTRATANTE poderá solicitar uma remarcação, sujeita a disponibilidade da CONTRATADA e multa de 30% do valor total, a título de cobertura dos custos de deslocamento, caracterização e logística. O mesmo se aplica a casos de doenças graves que inviabilizem a realização na data acordada.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 17ª. ', bold: true },
          'Em situações excepcionais, como falecimento do aniversariante ou pessoa próxima, o CONTRATANTE poderá requerer o cancelamento mediante comprovação documental oficial. A CONTRATADA compromete-se a analisar a devolução dos valores pagos, podendo realizar o reembolso integral ou parcial, considerando o estágio de execução dos serviços e despesas incorridas, sempre observando os princípios da boa-fé e equilíbrio contratual.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DISPOSIÇÕES GERAIS',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 18ª. ', bold: true },
          'O presente contrato passa a vigorar a partir do pagamento da entrada, dispensando a necessidade de assinatura física.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 19ª. ', bold: true },
          'As partes declaram que não existe qualquer vínculo empregatício entre elas, sendo os serviços prestados sob regime de autonomia.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 20ª. ', bold: true },
          'É vedada a cessão ou transferência deste contrato a terceiros sem prévia e expressa autorização da CONTRATADA.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 21ª. ', bold: true },
          'Para solução de quaisquer controvérsias oriundas deste contrato, fica eleito o foro da comarca de São José do Rio Preto/SP, com renúncia de qualquer outro, por mais privilegiado que seja.'
        ],
        margin: [0, 0, 0, 30]
      },
      {
        text: `São José do Rio Preto, ${contractDate}.`,
        margin: [0, 20, 0, 40]
      },
      {
        text: '_________________________________________',
        alignment: 'center',
        margin: [0, 0, 0, 5]
      },
      {
        text: 'Beatriz Bolzoni Floriano',
        alignment: 'center',
        bold: true
      },
      {
        text: 'CONTRATADA',
        alignment: 'center',
        fontSize: 10
      }
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        alignment: 'center'
      }
    },
    defaultStyle: {
      fontSize: 10,
      alignment: 'justify'
    }
  };

  (pdfMake as any).createPdf(docDefinition).download(`Contrato-${data.clientName}-${formattedDate}.pdf`);
}

function numberToWords(num: number): string {
  const words = [
    'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
    'dezoito', 'dezenove', 'vinte'
  ];
  
  if (num <= 20) return words[num];
  if (num < 30) return `vinte e ${words[num - 20]}`;
  if (num < 40) return `trinta${num % 10 ? ` e ${words[num % 10]}` : ''}`;
  if (num < 50) return `quarenta${num % 10 ? ` e ${words[num % 10]}` : ''}`;
  return String(num);
}
