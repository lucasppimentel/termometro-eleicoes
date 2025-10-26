import { getNeo4jDriver } from "../../../../infra/database";

// --- API Endpoint: GET /status ---
export default async function handler(req, res) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  if (req.method === "GET") {
    let serverVersion = null;
    let activeConnections = 0;

    try {
      // Ping the database by running a simple query
      await session.run("RETURN 1");

      // Get the database version using a Neo4j system procedure
      const versionResult = await session.run(`
        CALL dbms.components() YIELD name, versions
        WHERE name = 'Neo4j Kernel'
        RETURN versions[0] AS version
      `);
      serverVersion = versionResult.records[0].get("version");

      // Get the number of active queries/connections
      const activeConResult = await session.run(`
        CALL dbms.listConnections()
      `);
      activeConnections = activeConResult["records"].length;

      const statusResponse = {
        timestamp: new Date().toISOString(),
        database: {
          version: serverVersion,
          active_connections: activeConnections,
        },
      };

      res.status(200).json(statusResponse);
    } catch (error) {
      console.error("Error fetching Neo4j status:", error);
      res.status(500).json({
        error: "Error connecting to Neo4j database",
        details: error.message,
      });
    } finally {
      // Always close the session
      await session.close();
    }
  }
}
