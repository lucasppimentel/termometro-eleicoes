import database from "infra/database";

async function status(request, response) {
  const version = await database.query("SHOW server_version;");
  const maxCon = await database.query("SHOW max_connections;");
  const activeCon = await database.query(
    `SELECT COUNT(*)::int FROM pg_stat_activity WHERE datname = '${process.env.POSTGRES_DB}';`,
  );

  response.status(200).json({
    timestamp: new Date().toISOString(),
    database: {
      version: version.rows[0].server_version,
      max_connections: parseInt(maxCon.rows[0].max_connections, 10),
      active_connections: activeCon.rows[0].count,
    },
  });
}

export default status;
