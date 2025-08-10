import neo4j from "neo4j-driver";
import { NextResponse } from "next/server";

const uri = "neo4j://" + process.env.NEO4J_URL + ":" + process.env.NEO4J_PORT;
const user = "neo4j";
const password = process.env.NEO4J_PASSWORD;

let driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// // --- API Endpoint: GET /status ---
export default async function handler(req, res) {
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
