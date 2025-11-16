import { getNeo4jDriver } from "../../../../../../infra/database";

/**
 * Endpoint para obter todas as discussões (Perguntas e Respostas) de um debate.
 * URL esperada: /api/debates/[debateId]/discussions
 */
export default async function handler(req, res) {
    // Captura o ID do debate da URL
    const { debateId } = req.query; 
    const driver = getNeo4jDriver();

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    if (!debateId) {
        return res.status(400).json({ error: "O parâmetro 'debateId' é obrigatório." });
    }

    const session = driver.session();
    try {
        
        // Query Cypher: Encontra todas as perguntas de um debate, agrupa-as com as respostas 
        // associadas e coleta os dados em uma estrutura JSON limpa.
        const cypherQuery = `
            MATCH (d:Debate {debate_id: $debateId})
            MATCH (d)-[:TEM_DISCURSO]->(sp:Speech)-[:EH_PERGUNTA]->(p:PERGUNTA)
            MATCH (sp)<-[:PROFERIU]-(cp:Candidato)
            MATCH (p)-[:DIRECIONADA_A]->(ca:Candidato)

            OPTIONAL MATCH (sp)-[:ABORDOU_TEMA]->(t:TEMA)
            OPTIONAL MATCH (sp)-[:FAZ_PARTE_DE]->(disc:DISCUSSAO)

            OPTIONAL MATCH (sr:Speech)-[r:RESPONDEU_A]->(sp)
            OPTIONAL MATCH (sr)<-[:PROFERIU]-(cr:Candidato)

            WITH sp, cp, ca, t, disc,
                COLLECT({
                    resposta_speech_id:
                        CASE 
                            WHEN sr.speech_id IS NULL THEN NULL
                            ELSE toFloat(sr.speech_id)
                        END,

                    resposta_text: sr.text,
                    candidato_resposta_nome: cr.nome,
                    score_relevancia: r.score,
                    justificativa_relevancia: r.justification,

                    score_float:
                        CASE 
                            WHEN r.score IS NULL THEN NULL
                            ELSE toFloat(r.score)
                        END
                }) AS respostas

            RETURN {
                pergunta_speech_id:
                    CASE 
                        WHEN sp.speech_id IS NULL THEN NULL
                        ELSE toFloat(sp.speech_id)
                    END,

                pergunta_text: sp.text,

                pergunta_start:
                    CASE 
                        WHEN sp.start IS NULL THEN NULL
                        ELSE toFloat(sp.start)
                    END,

                pergunta_end:
                    CASE 
                        WHEN sp.end IS NULL THEN NULL
                        ELSE toFloat(sp.end)
                    END,

                candidato_perguntou: cp.nome,
                candidato_alvo: ca.nome,
                tema: t.nome,

                discussion_id:
                    CASE 
                        WHEN disc.discussion_id IS NULL THEN NULL
                        ELSE toFloat(disc.discussion_id)
                    END,

                respostas: [r IN respostas WHERE r.resposta_speech_id IS NOT NULL]
            } AS discussion
            ORDER BY sp.start
        `;

        const result = await session.run(cypherQuery, { debateId: debateId });

        const discussions = result.records.map(record => record.get("discussion"));

        res.status(200).json(discussions);
    } catch (error) {
        console.error(`Error fetching discussions for debate ${debateId}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        await session.close();
    }
}