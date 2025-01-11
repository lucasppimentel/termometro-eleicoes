import pg from "pg";

const { Client } = pg;

async function query(queryString) {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: process.env.POSTGRES_PORT,
    ssl:
      (process.env.NODE_ENV === "development") |
      (process.env.NODE_ENV === "test")
        ? false
        : true,
  });
  await client.connect();

  try {
    const res = await client.query(queryString);
    await client.end();
    return res;
  } catch (error) {
    await client.end();
    console.error(`Erro ao executar a query ${error}`);
  }
}

export default {
  query: query,
};
