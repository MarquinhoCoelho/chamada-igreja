import { fastify } from 'fastify';
import cors from '@fastify/cors';
import { DatabasePostgres } from './database-postgres.js';
import cron from 'node-cron';
import nodemailer from 'nodemailer';  // Importando Nodemailer

const server = fastify();
const databasePostgres = new DatabasePostgres();

// Configuração do serviço de e-mail (Gmail como exemplo)
// const transporter = nodemailer.createTransport({
//   service: 'gmail', // Pode ser alterado para outro serviço, como Outlook, Yahoo, etc.
//   auth: {
//     user: 'marcos.coelhodh@gmail.com',  // Seu e-mail
//     pass: 'mvsc28022000'    // Senha do seu e-mail (ou App Password)
//   }
// });

// Configuração do e-mail usando variáveis de ambiente para segurança
const emailDoPastor = 'mvscmarcos@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'marcos.coelhodh@gmail.com', // Substitua por uma variável de ambiente para segurança
    pass: 'rqmb kvzf rjoc jysc'
  }
});

// CORS
server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// Rota para registrar uma lista de chamadas
server.post('/chamadas', async (request, reply) => {
  const chamadas = request.body; // Espera um array de objetos com nome, veio, e data opcional
  await databasePostgres.createChamadas(chamadas);

  // Após registrar as chamadas, envia o e-mail diário com os faltantes
  const dataAtual = new Date().toISOString().split('T')[0]; // Formata a data no formato 'YYYY-MM-DD'
  try {
    await montarEmail(reply, emailDoPastor, dataAtual); // Envia o email com a lista de faltantes
    await databasePostgres.deleteAllChamadas();
    return reply.status(201).send({ message: 'Chamadas registradas e e-mail diário enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar e-mail diário:', error);
    return reply.status(500).send({ message: 'Chamadas registradas, mas houve um erro ao enviar o e-mail diário.' });
  }
});

// Rota para deletar todas as chamadas após envio semanal
server.delete('/chamadas/DELETAR', async (request, reply) => {
  await databasePostgres.deleteAllChamadas();
  return reply.status(200).send({ message: 'Chamadas deletadas' });
});

// Rota para listar as chamadas da última semana
server.get('/chamadas/semana-passada', async (request, reply) => {
  const chamadas = await databasePostgres.checkPresencaUltimaSemana();
  return chamadas;
});

// Função para enviar e-mail com a lista de faltantes
async function enviarEmail(listaFaltantes, emailTo) {
  const dataAtual = new Date();
  const dia = dataAtual.getDate().toString().padStart(2, '0');
  const mes = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
  const ano = dataAtual.getFullYear();
  const dataFormatada = `${dia}/${mes}/${ano}`;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'marcos.coelhodh@gmail.com',
    to: emailTo || emailDoPastor,
    subject: `Faltantes no culto do dia ${dataFormatada}`,
    text: listaFaltantes
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('E-mail enviado: %s', info.messageId);
}


// Função para montar e enviar e-mail com lista de faltantes
async function montarEmail(reply, emailTo, dataEspecifica) {
  try {
    const faltantes = await databasePostgres.getFaltantes(dataEspecifica);

    if (faltantes.length === 0) {
      // Verifica se não há faltantes e ajusta a mensagem
      await enviarEmail('Nenhum faltante registrado para esta data.', emailTo);
      return reply.status(200).send({ message: 'Nenhum faltante registrado para esta data.' });
    }

    // Caso existam faltantes, lista-os no e-mail
    const listaFaltantes = faltantes.map(faltante => faltante.nome).join(', \n \n');
    await enviarEmail(`Faltantes no culto: ${listaFaltantes}`, emailTo);

    return reply.status(200).send({ message: 'Lista enviada por e-mail com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    return reply.status(500).send({ error: `Erro ao enviar a lista por e-mail: ${err.message}` });
  }
}

// Rota para enviar lista de faltantes de uma data específica
server.get('/chamadas/email/:email/:data', async (request, reply) => {
  const dataEspecifica = request.params.data;
  await montarEmail(reply, request.params.email, dataEspecifica);
});

// Função de envio semanal e deleção de chamadas
// cron.schedule('0 7 * * 1', async () => {
//   console.log('Enviando lista semanal de faltantes...');

//   // Envia o e-mail para o pastor
//   await montarEmail({}, emailDoPastor);

//   // Deleta todas as chamadas após envio semanal
//   await databasePostgres.deleteAllChamadas();
//   console.log('Dados de chamadas da última semana foram deletados.');
// });

// Iniciar o servidor
server.listen({ port: 3333 }, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Servidor rodando na porta 3333');
});
