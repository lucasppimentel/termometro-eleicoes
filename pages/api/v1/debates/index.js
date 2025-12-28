// /api/v1/debates/index.js

import { getNeo4jDriver } from "../../../../infra/database";

/**
 * Endpoint para obter a lista de todos os DEBATES com seus metadados para a Home Page.
 * URL esperada: /api/v1/debates/index
 */
export default async function handler(req, res) {
    const driver = getNeo4jDriver();

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const session = driver.session();
    try {
        
        // Query Cypher: Encontra todos os debates e agrega as informações necessárias.
        const cypherQuery = `
            MATCH (d:Debate)
            
            // Participantes
            OPTIONAL MATCH (d)<-[:PARTICIPOU_DO_DEBATE]-(c:Candidato)
            
            // Temas abordados
            OPTIONAL MATCH (d)-[:ABORDOU_TEMA_DEBATE]->(t:TEMA)

            // Relevância Média das Respostas (Calculada sobre a relação RESPONDEU_A)
            OPTIONAL MATCH (d)-[:TEM_DISCURSO]->(s:Speech)-[r:RESPONDEU_A]->(:Speech)
            
            // Agrupamento e retorno dos dados.
            RETURN 
                d.debate_id AS id,
                d.title AS title,
                d.date AS date,
                d.cargo AS cargo,
                d.municipio AS municipio,
                d.estado AS estado,
                
                // Agrega a lista de nomes dos candidatos
                collect(DISTINCT c.nome) AS participantes,
                
                // Agrega a lista de nomes dos temas
                collect(DISTINCT t.nome) AS temas,

                // Calcula a média das pontuações de relevância
                avg(r.score) AS media_relevancia_respostas
            ORDER BY d.date DESC
        `;

        const result = await session.run(cypherQuery);

        const debates = result.records.map(record => ({
            id: record.get("id"),
            title: record.get("title"),
            date: record.get("date"),
            location: `${record.get("municipio")} - ${record.get("estado")}`,
            cargo: record.get("cargo"),
            
            participantes: record.get("participantes"),
            temas: record.get("temas"),
            
            // Formata a média para uma casa decimal, ou N/A
            relevancia_media: record.get("media_relevancia_respostas") 
                ? record.get("media_relevancia_respostas").toFixed(1) 
                : 'N/A'
        }));

        res.status(200).json(debates);

    } catch (error) {
        console.error("Error fetching debate index:", error);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        await session.close();
    }
}