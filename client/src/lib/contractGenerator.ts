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
  clientEmail?: string;
  clientRua?: string;
  clientNumero?: string;
  clientBairro?: string;
  clientCidade?: string;
  clientEstado?: string;
  clientResponsibleName?: string;
  clientCargo?: string;
  eventDate: Date;
  eventTime: string;
  eventEndTime?: string;
  location: string;
  contractValue: string;
  package: string;
  packageNotes?: string;
  characters: string[];
  employees?: string[];
  estimatedChildren: number;
  eventDuration?: number;
}

export function generateContract(data: ContractData, forceContractType?: "fisica" | "juridica") {
  const contractType = forceContractType || data.clientPersonType;
  
  if (contractType === "juridica") {
    generateCorporateContract(data);
  } else {
    generatePartyContract(data);
  }
}

function generateCorporateContract(data: ContractData) {
  const formattedDate = format(new Date(data.eventDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const contractDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const eventHour = data.eventTime || "00:00";
  const endHour = data.eventEndTime || (() => {
    const duration = data.eventDuration || 3;
    const [hours, minutes] = eventHour.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration * 60;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  })();
  
  const duration = data.eventDuration || 3;

  const clientAddress = [
    data.clientRua ? `${data.clientRua}` : '',
    data.clientNumero ? `nº ${data.clientNumero}` : '',
    data.clientBairro ? `no Bairro ${data.clientBairro}` : '',
    data.clientCidade && data.clientEstado ? `em ${data.clientCidade}/${data.clientEstado}` : ''
  ].filter(Boolean).join(', ');

  const numEmployees = data.employees?.length || 1;
  const employeeText = numEmployees > 1 ? `${numEmployees} produtores` : '1 produtor';

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    content: [
      {
        text: 'CONTRATO DE PRESTAÇÃO DE SERVIÇO DE RECREAÇÃO EM EVENTO CORPORATIVO',
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
        text: [
          { text: 'CONTRATANTE: ', bold: true },
          `${data.clientName}`,
          data.clientCnpj ? ` inscrito no CNPJ sob o n°. ${data.clientCnpj}` : '',
          clientAddress ? ` com sede em ${clientAddress}` : '',
          data.clientEmail ? ` endereço eletrônico ${data.clientEmail}` : '',
          data.clientPhone ? ` telefone ${data.clientPhone}` : '',
          data.clientResponsibleName ? ` ${data.clientResponsibleName}` : '',
          '.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'CONTRATADA: ', bold: true },
          'Beatriz Bolzoni Floriano, brasileira, empresária individual, inscrita no CNPJ sob o n°.42.508.153/0001-94, com sede na Rua Carlos Medeiros Doria, nº 209, Jardim Viena em São José do Rio Preto/SP, endereço eletrônico: mundoencantadoproducoes@gmail.com, contato (17)99725-2950'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: 'As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviço de Recreação em Evento Corporativo, que se regerá pelas cláusulas seguintes e pelas condições de pagamento descritas no presente.',
        margin: [0, 0, 0, 20]
      },
      {
        text: 'OBJETO DO CONTRATO',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 1ª. ', bold: true },
          'O objeto do presente contrato é a prestação de serviços de recreação infantil, consistindo na ANIMAÇÃO DE EVENTO CORPORATIVO PARTICULAR, com objetivos e metodologia prévia e consensualmente estabelecidas, levando sempre em consideração a idade, as condições do local e espaço que se acordarem.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          data.eventTitle || 'Evento Corporativo',
          data.packageNotes ? ` - ${data.packageNotes}` : ''
        ].join(''),
        bold: true,
        margin: [0, 0, 0, 5]
      },
      {
        text: `Com ${employeeText} para executar a atividade, com duração de ${duration} horas (com 1 pausa de 15 minutos)`,
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Segundo. ', bold: true },
          'A lista de itens pertencente a recreação contratada será enviada pelo Contratada via email ou WhatsApp, ao qual o Contratante declara ter conhecimento.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DO EVENTO CORPORATIVO',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 2ª. ', bold: true },
          `O Evento Corporativo será realizado no dia ${formattedDate} às ${eventHour} horas, em ${data.location}.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo único. ', bold: true },
          'A Contratante declara a veracidade do endereço da realização informado, estando ciente que caso a informação não esteja correta poderá ocasionar atrasos ou até mesmo o cancelamento do presente contrato.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 3ª. ', bold: true },
          `A recreação terá início às ${eventHour} horas, encerrando-se às ${endHour} horas.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo primeiro. ', bold: true },
          'O tempo previsto para início e término do serviço deverá ser respeitado e em caso de atraso no início por parte do CONTRATANTE, a CONTRATADA se reserva o direito de encerrar as atividades no horário previsto. Se houver atraso por parte da empresa CONTRATADA, esta deverá compensar ao final do horário previsto com um acréscimo de 15 minutos.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo segundo. ', bold: true },
          'O dia e horário exato da realização do evento deverá ser informado para a CONTRATADA em 05 (cinco) dias antes da sua realização, em razão disso não poderá alterá-lo mais devido a programação de agenda e realização de possíveis eventos no mesmo dia.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 4ª. ', bold: true },
          'Se o CONTRATANTE desejar ampliar o horário da recreação, deverá ser em comum acordo com a CONTRATADA, e caso haja acordo, será cobrada taxa extra para cada personagem, no valor de R$80,00 a cada meia hora a ser pago em dinheiro no momento do acordo.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DAS OBRIGAÇÕES DO CONTRATANTE',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 5ª. ', bold: true },
          'O(a) CONTRATANTE compromete-se a manter a disposição da CONTRATADA todos os meios necessários para execução dos serviços, ou seja, energia elétrica, iluminação e local adequado para a realização das atividades.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 6ª. ', bold: true },
          'O(a) Contratante se compromete a disponibilizar um espaço exclusivo para a Contratada, no qual deverá dispor de água para o bem-estar dos artistas e recreadores durante o evento.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo único: ', bold: true },
          'Fica acordado que, durante a realização do evento, os personagens terão a possibilidade de fazer pequenas pausas para garantir seu bem-estar, incluindo pausas para hidratação (beber água) e para necessidades fisiológicas. O contratante se compromete a proporcionar as condições adequadas para que essas pausas sejam realizadas de forma confortável, sem comprometer o andamento do evento.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 7ª. ', bold: true },
          'Se o evento for realizado em condomínio ou prédio, o CONTRATANTE deverá avisar com antecedência aos seguranças e à portaria a chegada dos funcionários da CONTRATADA, facilitando a entrada com veículo nas dependências, para carga e descarga de material.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 8ª. ', bold: true },
          'O CONTRATANTE deverá efetuar o pagamento na forma e condições estabelecidas na cláusula 12ª.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 9ª. ', bold: true },
          'A CONTRATANTE cede as imagens da recreação do evento corporativo para serem utilizadas, em caráter gratuito, na veiculação em mídia especializada, visando a divulgação do referido evento.'
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
          { text: 'Cláusula 10ª. ', bold: true },
          'Se houver atraso por parte da CONTRATADA, esta deverá compensar ao final do horário previsto com um acréscimo de 20 minutos.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 11ª. ', bold: true },
          'A CONTRATADA deverá executar todas as atividades propostas, devendo, caso contrário, ressarcir ao CONTRATANTE o valor equivalente ao tempo previsto em cada atividade não executada, salvo em caso de pedido expresso do CONTRATANTE pela supressão de qualquer atividade.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Primeiro. ', bold: true },
          'A equipe da empresa CONTRATADA não tem responsabilidade pela segurança das pessoas, durante todo o tempo do evento, devendo a CONTRATANTE zelar e responder pela segurança do local.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo segundo. ', bold: true },
          'Por esta cláusula, a CONTRATANTE isenta a CONTRATADA de toda e qualquer responsabilidade pelos danos causados pelas crianças nos equipamentos, toalhas, utensílios ou qualquer outro material utilizado para a realização da festa, ficando desta forma responsável pela substituição do item danificado.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'VALOR E CONDIÇÕES DE PAGAMENTO',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 12ª. ', bold: true },
          `O presente serviço será remunerado pela quantia de ${data.contractValue} devendo ser pago a título de reserva da data no ato da assinatura do contrato o percentual de 30% (trinta por cento) do valor do contrato, que será efetuado por pix no CNPJ: 42.508.153/0001-94.`
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Primeiro. ', bold: true },
          'Caso o CONTRATANTE efetue pagamento em valor superior ao arbitrado a título de sinal, a CONTRATADA somente se obrigará a devolver a diferença entre os valores do sinal e o valor pago.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Segundo. ', bold: true },
          'O pagamento será efetuado via deposito bancário, pix, link de pagamento ou outra forma combinada e deverá estar quitado em até 5 (cinco) dias antes da realização do evento.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Terceiro. ', bold: true },
          'Em se tratando de rescisão contratual com pagamento nas modalidades de link de pagamento ou cartão de crédito parcelado, a CONTRATADA devolverá a quantia a CONTRATANTE da seguinte maneira: descontará os 30% do valor total que corresponde ao sinal, bem como os valores da respectiva taxa de cartão. O valor competente a CONTRATANTE será devolvido pela CONTRATA somente após o pagamento de todas as parcelas.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Quarto. ', bold: true },
          'Ocorrendo a contratação de dois ou mais personagens, fica a CONTRATANTE responsável pelas despesas de contratação, garantindo a CONTRATADA a retenção do valor pago a título de sinal referente a este personagem, bem como as despesas para a realização da recreação.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Quinto. ', bold: true },
          'Em caso de reagendamento a CONTRATANTE deverá avisar com antecedência de no mínimo 15 dias a CONTRATADA, e somente em caso de possibilidade e disponibilidade da data em sua agenda, reserva-se no direito de cobrança de taxa de reagendamento, no percentual de 50% (cinquenta por cento) do valor total do contrato.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo Sexto. ', bold: true },
          'Em caso de alteração no horário do evento, a CONTRATANTE deverá avisar a CONTRATADA, com antecedência de no mínimo 48h, para que seja acordado novo horário, disponível com a agenda da CONTRATADA.'
        ],
        margin: [0, 0, 0, 20]
      },
      {
        text: 'DA RESCISÃO MOTIVADA',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 13ª. ', bold: true },
          'Se a desistência for por parte do CONTRATANTE, considera-se a perda do valor pago a título de sinal, uma vez que a CONTRATADA havia recebido o referido valor a título de reserva da data e para pagamento de despesas iniciais para a data.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 14ª. ', bold: true },
          'Se a desistência for por parte da CONTRATADA, esta deverá ressarcir o valor do sinal dado pelo CONTRATANTE, salvo se ocorrer o previsto na Cláusula 11ª, não cabendo, nesse caso, nem a devolução do sinal.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Parágrafo único. ', bold: true },
          'Não se enquadram em rescisão motivada os motivos previstos nos itens "a", "b" e "c", ficando tal valor reservado para o próximo evento que poderá ser reagendado dentro de 12 meses conforme disponibilidade de agenda, não havendo prejuízo para nenhuma das partes.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        ul: [
          'A ação de fenômenos naturais que comprometer e impossibilitar a prestação do serviço. Entendem-se por causas naturais: tempestades, deslizamentos, alagamentos, fechamento de vias por desabamento ou crateras, queda de árvores que impeçam o fornecimento de energia, entre outros.',
          'Paralizações devido ao Covid 19 ou por epidemias causadas por doenças semelhantes.',
          'Por motivo de força maior (como doença grave, acidente, falecimento, etc.), comprovado em atestado ou declaração médica por uma das partes (CONTRATANTE ou CONTRATADA).'
        ],
        margin: [20, 0, 0, 20]
      },
      {
        text: 'CONDIÇÕES GERAIS',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 15ª. ', bold: true },
          'Esse contrato é virtual, não havendo necessidade de assinaturas, tendo em vista que a partir do pagamento realizado, como consta na Cláusula 12ª, o contrato já estará sendo válido judicialmente com ambas as partes de acordo.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 16ª. ', bold: true },
          'Fica compactuada entre as partes a total inexistência de vínculo trabalhista entre as partes contratadas, excluindo as obrigações previdenciárias e os encargos sociais, não havendo entre CONTRATADA e CONTRATANTE qualquer tipo de relação de subordinação.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 17ª. ', bold: true },
          'Salvo com a expressa autorização do CONTRATANTE, não pode a CONTRATADA transferir ou subcontratar os serviços previstos neste instrumento, sob o risco de ocorrer a rescisão imediata.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Cláusula 18ª. ', bold: true },
          'Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de São José do Rio Preto/SP.'
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: 'Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor.',
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

  (pdfMake as any).createPdf(docDefinition).download(`Contrato-Corporativo-${data.clientName}-${formattedDate}.pdf`);
}

function generatePartyContract(data: ContractData) {
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
        text: [
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
