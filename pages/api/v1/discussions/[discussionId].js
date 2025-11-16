import { getNeo4jDriver } from "../../../../infra/database";

/**
 * Endpoint para obter a linha do tempo e todos os detalhes de uma única DISCUSSAO.
 * URL esperada: /api/discussions/[discussionId]
 */
export default async function handler(req, res) {
    // Captura o ID da discussão da URL
    const { discussionId } = req.query; 
    const driver = getNeo4jDriver();

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    if (!discussionId) {
        return res.status(400).json({ error: "O parâmetro 'discussionId' é obrigatório." });
    }

    const session = driver.session();
    try {
        
        // Query Cypher: Encontra todos os discursos que pertencem a uma DISCUSSAO, 
        // e anexa todos os metadados de Pergunta, Resposta, Orador e Tema.
        const cypherQuery = `
            MATCH (disc:DISCUSSAO {discussion_id: toInteger($discussionId)})
            // Encontra todos os discursos na discussão
            MATCH (s:Speech)-[:FAZ_PARTE_DE]->(disc)
            // Orador
            MATCH (s)<-[:PROFERIU]-(c:Candidato)

            // Info do Debate (para obter o youtube_id)
            MATCH (s)-[:TEM_DISCURSO]-(d:Debate)

            // Info de Pergunta (se for uma pergunta)
            OPTIONAL MATCH (s)-[:EH_PERGUNTA]->(p:PERGUNTA)-[:DIRECIONADA_A]->(ca:Candidato)

            // Info de Resposta (se for uma resposta a outra fala)
            OPTIONAL MATCH (s)-[r:RESPONDEU_A]->(sp:Speech)

            // Info de TEMA (pode ser abordado em qualquer fala)
            OPTIONAL MATCH (s)-[:ABORDOU_TEMA]->(t:TEMA)

            // Retorna a linha do tempo sequencial
            RETURN 
                s.speech_id AS speech_id,
                s.text AS text,
                CASE 
                    WHEN s.start IS NULL THEN null
                    WHEN s.start IS NOT NULL THEN toFloat(s.start)
                    ELSE toFloat(s.start.low)
                END AS start_time,
                CASE 
                    WHEN s.end IS NULL THEN null
                    WHEN s.end IS NOT NULL THEN toFloat(s.end)
                    ELSE toFloat(s.end.low)
                END AS end_time,
                c.nome AS orador_nome,
                c.titulo_eleitoral AS orador_titulo_eleitoral,
                
                // Dados Contextuais
                t.nome AS tema_abordado,
                d.debate_id AS debate_id,
                d.title AS debate_title,
                
                // Dados da Pergunta
                p IS NOT NULL AS eh_pergunta,
                ca.nome AS alvo_nome,
                
                // Dados da Resposta
                r IS NOT NULL AS eh_resposta,
                r.score AS score_relevancia,
                r.justification AS justificativa_relevancia,
                sp.speech_id AS respondeu_a_speech_id
            ORDER BY start_time ASC
        `;

        const result = await session.run(cypherQuery, { discussionId: discussionId });

        const discussion_timeline = result.records.map(record => ({
            speech_id: record.get("speech_id"),
            text: record.get("text"),
            start_time: record.get("start_time"),
            end_time: record.get("end_time"),
            orador: {
                nome: record.get("orador_nome"),
                titulo_eleitoral: record.get("orador_titulo_eleitoral"),
            },
            contexto: {
                tema_abordado: record.get("tema_abordado"),
                discussion_id: discussionId,
                debate_id: record.get("debate_id"),
                debate_title: record.get("debate_title"),
            },
            interacao: {
                eh_pergunta: record.get("eh_pergunta"),
                alvo_nome: record.get("alvo_nome") || null,
                eh_resposta: record.get("eh_resposta"),
                respondeu_a_speech_id: record.get("respondeu_a_speech_id") || null,
                relevancia: record.get("eh_resposta") ? {
                    score: record.get("score_relevancia"),
                    justificativa: record.get("justificativa_relevancia"),
                } : null,
            }
        }));

        res.status(200).json(discussion_timeline);
    } catch (error) {
        console.error(`Error fetching detailed discussion ${discussionId}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        await session.close();
    }
}