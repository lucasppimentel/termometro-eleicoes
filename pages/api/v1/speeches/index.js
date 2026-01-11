import { getNeo4jDriver } from "../../../../infra/database";

export default async function handler(req, res) {
  const driver = getNeo4jDriver();
  
  if (req.method === "GET") {
    const session = driver.session();
    try {
      // Use OPTIONAL MATCH to find speeches even if some relationships are missing
      const result = await session.run(`
        MATCH (f:Speech)
        OPTIONAL MATCH (f)<-[r_a:PROFERIU]-(i:Candidato)
        OPTIONAL MATCH (f)<-[r_b:TEM_DISCURSO]-(d:Debate)
        RETURN f, i, d
        ORDER BY f.inicio
      `);

      console.log("Result records from GET request:", result.records);

      const speeches = result.records.map((record) => {
        const fala = record.get("f")?.properties || {};
        const candidato = record.get("i")?.properties || null;
        const debate = record.get("d")?.properties || null;

        return {
          ...fala,
          candidato, // return full candidato object
          debate, // return full debate object
        };
      });

      res.status(200).json(speeches);
    } catch (error) {
      console.error("Error fetching speeches:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
