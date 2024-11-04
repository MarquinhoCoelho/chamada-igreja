import { fastify } from 'fastify';
import cors from '@fastify/cors';
import { DatabasePostgres } from './database-postgres.js';
import cron from 'node-cron';
import nodemailer from 'nodemailer';

const server = fastify();
const databasePostgres = new DatabasePostgres();

const emailDoPastor = 'mvscmarcos@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'marcos.coelhodh@gmail.com',
    pass: 'rqmb kvzf rjoc jysc'
  }
});

// CORS
server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

server.post('/chamadas', async (request, reply) => {
  const chamadas = request.body;
  await databasePostgres.createChamadas(chamadas);

  const dataAtual = new Date().toISOString().split('T')[0]; //'YYYY-MM-DD'
  try {
    await montarEmail(reply, emailDoPastor, dataAtual);
    await databasePostgres.deleteAllChamadas();
    return reply.status(201).send({ message: 'Chamadas registradas e e-mail diário enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar e-mail diário:', error);
    return reply.status(500).send({ message: 'Chamadas registradas, mas houve um erro ao enviar o e-mail diário.' });
  }
});

server.delete('/chamadas/DELETAR', async (request, reply) => {
  await databasePostgres.deleteAllChamadas();
  return reply.status(200).send({ message: 'Chamadas deletadas' });
});

server.get('/chamadas/semana-passada', async (request, reply) => {
  const chamadas = await databasePostgres.checkPresencaUltimaSemana();
  return chamadas;
});

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


async function montarEmail(reply, emailTo, dataEspecifica) {
  try {
    const faltantes = await databasePostgres.getFaltantes(dataEspecifica);

    if (faltantes.length === 0) {
      await enviarEmail('Nenhum faltante registrado para esta data.', emailTo);
      return reply.status(200).send({ message: 'Nenhum faltante registrado para esta data.' });
    }

    const listaFaltantes = faltantes.map(faltante => faltante.nome).join(', \n \n');
    await enviarEmail(`Faltantes no culto: ${listaFaltantes}`, emailTo);

    return reply.status(200).send({ message: 'Lista enviada por e-mail com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    return reply.status(500).send({ error: `Erro ao enviar a lista por e-mail: ${err.message}` });
  }
}

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

server.listen({ port: 3333 }, erro => {
  if (erro) {
    console.error(erro);
    process.exit(1);
  }
  console.log('Servidor rodando na porta 3333');
});
