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
