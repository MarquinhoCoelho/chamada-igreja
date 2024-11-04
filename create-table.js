import { sql } from './db.js';

sql`
  CREATE TABLE chamada (
      id text PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      veio BOOLEAN NOT NULL,
      data TIMESTAMP NOT NULL DEFAULT NOW()
  );
`.then(() => {
  console.log('Tabela chamada criada com sucesso');
}).catch(err => {
  console.error('Erro ao criar a tabela', err);
});
