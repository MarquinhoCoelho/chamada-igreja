import { randomUUID } from "crypto";
import { sql } from './db.js';

export class DatabasePostgres {
  async createChamadas(chamadas) {
    const insertPromises = chamadas.map(async chamada => {
      const id = randomUUID();
      const { nome, veio, data = new Date() } = chamada;
  
      console.log(`Inserindo chamada: ${JSON.stringify({ id, nome, veio, data })}`); // Log para depuração
  
      await sql`INSERT INTO chamada (id, nome, veio, data)
      VALUES (${id}, ${nome}, ${veio}, ${data})`;
    });
  
    await Promise.all(insertPromises);
  }

  // Método para deletar todas as chamadas
  async deleteAllChamadas() {
    await sql`DELETE FROM chamada`;
  }

  async checkPresencaUltimaSemana() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
  
    console.log(`Buscando faltantes entre ${startDate.toISOString()} e ${endDate.toISOString()}`);
  
    const chamadas = await sql`
      SELECT * FROM chamada 
      WHERE veio = false AND data BETWEEN ${startDate} AND ${endDate}
    `;
    return chamadas;
  }

  async getFaltantes(dataEspecifica) {
    const data = new Date(dataEspecifica);
    console.log(`Buscando faltantes para a data: ${data.toISOString()}`);

    // const chamadas = await sql`
    //   SELECT * FROM chamada 
    //   WHERE veio = false AND DATE(data) = DATE(${data})
    // `;

    const chamadas = await sql`
    SELECT * FROM chamada WHERE veio = false`;
    return chamadas;
  }
  
}
