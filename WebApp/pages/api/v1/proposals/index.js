import { getNeo4jDriver } from "../../../../infra/database";

export default async function handler(req, res) {
  const driver = getNeo4jDriver();
  
  if (req.method === "GET") {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (p:Proposal)
        OPTIONAL MATCH (p)<-[r_a:CONTEM_PROPOSTA]-(f:Speech)
        OPTIONAL MATCH (f)<-[r_b:PROFERIU]-(c:Candidato)
        OPTIONAL MATCH (f)<-[r_c:TEM_DISCURSO]-(d:Debate)
        RETURN p, f, c, d
        ORDER BY f.inicio
      `);

      console.debug(result);

      const proposals = result.records.map((record) => {
        const proposal = record.get("p")?.properties || {};
        const speech = record.get("f")?.properties || null;
        const candidato = record.get("c")?.properties || null;
        const debate = record.get("d")?.properties || null;

        return {
          ...proposal,
          speech: speech
            ? {
                ...speech,
                candidato: candidato
                  ? {
                      ...candidato,
                      nr_cpf: candidato.nr_cpf?.low ?? null,
                      nr_candidato: candidato.nr_candidato?.low ?? null,
                    }
                  : null,
                debate: debate || null,
              }
            : null,
        };
      });

      res.status(200).json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
