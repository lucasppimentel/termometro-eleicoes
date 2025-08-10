// pages/api/speeches.js
import neo4j from "neo4j-driver";

// Create driver once and reuse it
const uri = "bolt://localhost:7687";
const user = "neo4j";
const password = "password";
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = driver.session();
    try {
      // Use OPTIONAL MATCH to find speeches even if some relationships are missing
      const result = await session.run(`
        MATCH (f:Fala)
        OPTIONAL MATCH (f)<-[:SPOKE]-(i:Interlocutor)
        OPTIONAL MATCH (f)-[:HAS_CLASSIFICATION]->(c:Classificacao)
        OPTIONAL MATCH (f)-[:IN_DEBATE]->(d:Debate)
        RETURN f, i, c, d
        ORDER BY f.inicio
      `);

      console.log("Result records from GET request:", result.records);

      const speeches = result.records.map((record) => {
        const fala = record.get("f").properties;
        const interlocutor = record.get("i")
          ? record.get("i").properties
          : null;
        const classificacao = record.get("c")
          ? record.get("c").properties
          : null;
        const debate = record.get("d") ? record.get("d").properties : null;

        return {
          ...fala,
          interlocutor: interlocutor ? interlocutor.nome_interlocutor : null,
          classificacao: classificacao
            ? classificacao.nome_classificacao
            : null,
          debate: debate
            ? {
                id_debate: debate.id_debate,
                data_debate: debate.data_debate,
                anfitriao: debate.anfitriao,
              }
            : null,
        };
      });

      res.status(200).json(speeches);
    } catch (error) {
      console.error("Error fetching speeches:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await session.close();
    }
  } else if (req.method === "POST") {
    const session = driver.session();
    try {
      const {
        speakerName,
        debateId,
        classificationName,
        falaText,
        start,
        end,
      } = req.body;

      const result = await session.run(
        `
        MERGE (d:Debate {id_debate: toInteger($debateId)})
        MERGE (i:Interlocutor {nome_interlocutor: $speakerName})
        MERGE (c:Classificacao {nome_classificacao: $classificationName})
        CREATE (f:Fala {fala: $falaText, inicio: toInteger($start), fim: toInteger($end)})
        CREATE (i)-[:SPOKE]->(f)
        CREATE (f)-[:IN_DEBATE]->(d)
        CREATE (f)-[:HAS_CLASSIFICATION]->(c)
        RETURN f, i, c, d
        `,
        {
          speakerName: speakerName,
          debateId: debateId,
          classificationName: classificationName,
          falaText: falaText,
          start: start,
          end: end,
        },
      );

      console.debug({
        speakerName: speakerName,
        debateId: debateId,
        classificationName: classificationName,
        falaText: falaText,
        start: start,
        end: end,
      });

      const record = result.records[0];
      const newFala = record.get("f").properties;
      const interlocutor = record.get("i").properties;
      const classificacao = record.get("c").properties;
      const debate = record.get("d").properties;

      const responseData = {
        ...newFala,
        interlocutor: interlocutor.nome_interlocutor,
        classificacao: classificacao.nome_classificacao,
        debate: {
          id_debate: debate.id_debate,
          data_debate: debate.data_debate,
          anfitriao: debate.anfitriao,
        },
      };
      res.status(201).json(responseData);
    } catch (error) {
      console.error("Error creating new speech:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
