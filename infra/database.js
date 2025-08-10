import { Client } from "pg";

async function query(queryObject) {
  let client;
  try {
    client = await getNewClient();

    let result;
    if (queryObject.constructor == Object) {
      const { userQuery, valores } = queryObject;
      result = await client.query(userQuery, valores);
    } else {
      result = await client.query(queryObject);
    }
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    await client.end();
  }
}

async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl:
      (process.env.NODE_ENV === "development") |
      (process.env.NODE_ENV === "test")
        ? false
        : true,
  });

  await client.connect();
  return client;
}

const buildQuery = (tabelas, filtros) => {
  // Lista de colunas permitidas para cada tabela
  const colunasPermitidas = {
    falas: [
      "id_fala",
      "id_interlocutor",
      "id_debate",
      "fala",
      "inicio",
      "fim",
      "id_classificacao",
    ],
    interlocutores: ["id_interlocutor", "nome_interlocutor"],
    debates: ["id_debate", "duracao", "data_debate", "anfitriao"],
    classificacoes: ["id_classificacao", "nome_classificacao"],
  };

  let userQuery = `SELECT\n`;
  const valores = []; // Para parâmetros da consulta

  // Verificar se as tabelas e colunas passadas estão entre as permitidas
  const arrayTabelas = Object.keys(tabelas);
  for (const tabela of arrayTabelas) {
    if (!colunasPermitidas[tabela]) {
      throw new Error(`Tabela '${tabela}' não permitida.`);
    }

    for (const coluna of tabelas[tabela]) {
      if (!colunasPermitidas[tabela].includes(coluna)) {
        throw new Error(
          `Coluna '${coluna}' na tabela '${tabela}' não permitida.`,
        );
      }

      // Colunas que serão selecionadas
      userQuery += `${tabela}.${coluna},\n`;
    }
  }

  // Remover a última vírgula da lista de colunas
  userQuery = userQuery.replace(/,\n$/, "");

  // Iniciar construção do FROM Statement
  userQuery += `\n\nFROM falas`;

  // Adicionar JOINs dinamicamente
  if (arrayTabelas.includes("classificacoes")) {
    userQuery += `
    LEFT JOIN classificacoes
      ON falas.id_classificacao = classificacoes.id_classificacao
    `;
  }

  if (arrayTabelas.includes("interlocutores")) {
    userQuery += `
    LEFT JOIN interlocutores
      ON falas.id_interlocutor = interlocutores.id_interlocutor
    `;
  }

  if (arrayTabelas.includes("debates")) {
    userQuery += `
    LEFT JOIN debates
      ON falas.id_debate = debates.id_debate
    `;
  }

  // Adicionar filtros, se existirem
  if (filtros) {
    userQuery += `\n\nWHERE `;
    let primeiroFiltro = true; // Flag para evitar "AND" antes do primeiro filtro

    for (const tabelaFiltro of Object.keys(filtros)) {
      if (!colunasPermitidas[tabelaFiltro]) {
        throw new Error(`Tabela de filtro '${tabelaFiltro}' não permitida.`);
      }

      for (const [coluna, valor] of Object.entries(filtros[tabelaFiltro])) {
        if (!colunasPermitidas[tabelaFiltro].includes(coluna)) {
          throw new Error(
            `Coluna de filtro '${coluna}' na tabela '${tabelaFiltro}' não permitida.`,
          );
        }

        // Para evitar SQL Injection, usamos parâmetros em vez de concatenar diretamente os valores
        const parametro = `$${valores.length + 1}`;
        valores.push(valor);

        if (primeiroFiltro) {
          userQuery += `${tabelaFiltro}.${coluna} = ${parametro}\n`;
          primeiroFiltro = false;
        } else {
          userQuery += `AND ${tabelaFiltro}.${coluna} = ${parametro}\n`;
        }
      }
    }
  }

  // Remover vírgulas finais e adicionar debug
  userQuery = userQuery.replace(/,\n$/, "");

  return { userQuery, valores };
};

const buildPostQuery = async (tabela, colunas) => {
  const colunasPermitidas = {
    falas: [
      "id_fala",
      "id_interlocutor",
      "id_debate",
      "fala",
      "inicio",
      "fim",
      "id_classificacao",
    ],
    interlocutores: ["id_interlocutor", "nome_interlocutor"],
    debates: ["id_debate", "duracao", "data_debate", "anfitriao"],
    classificacoes: ["id_classificacao", "nome_classificacao"],
  };

  if (!colunasPermitidas[tabela]) {
    throw new Error(`Tabela '${tabela}' não permitida.`);
  }

  // Verificar se todas as colunas são válidas
  const colunasValidas = Object.keys(colunas);
  for (const coluna of colunasValidas) {
    if (!colunasPermitidas[tabela].includes(coluna)) {
      throw new Error(`Coluna '${coluna}' não permitida na tabela '${tabela}'`);
    }
  }

  let userQuery = `INSERT INTO ${tabela} (`;
  let valores = []; // Para armazenar os valores a serem usados como parâmetros

  // Colunas na query
  const colunasStr = colunasValidas
    .map((coluna) => {
      valores.push(colunas[coluna]); // Adicionar o valor à lista de parâmetros
      return coluna;
    })
    .join(", ");

  userQuery += colunasStr + ") VALUES (";

  // Placeholders para os valores
  const placeholders = colunasValidas.map((_, i) => `$${i + 1}`).join(", ");

  userQuery += placeholders + ")";

  return { userQuery, valores };
};

export default {
  query,
  getNewClient,
  buildQuery,
  buildPostQuery,
};
