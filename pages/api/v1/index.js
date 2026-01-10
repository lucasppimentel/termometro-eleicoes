import { ApolloServer } from '@apollo/server';
import { Neo4jGraphQL } from "@neo4j/graphql";
import { getNeo4jDriver } from "../../../infra/database";

// Definição completa do Schema GraphQL baseado na estrutura do banco Neo4j
const typeDefs = `#graphql
  type Debate @node {
    debate_id: ID!
    title: String
    date: String
    cargo: String
    municipio: String
    estado: String
    cargo_relacionado: [Cargo!]! @relationship(type: "REFERE_AO_CARGO", direction: OUT)
    ano: [Ano!]! @relationship(type: "OCORRE_NO_ANO", direction: OUT)
    candidatos: [Candidato!]! @relationship(type: "PARTICIPOU_DO_DEBATE", direction: IN)
    discursos: [Speech!]! @relationship(type: "TEM_DISCURSO", direction: OUT)
    discussoes: [Discussao!]! @relationship(type: "CONTEM_DISCUSSAO", direction: OUT)
    temas: [Tema!]! @relationship(type: "ABORDOU_TEMA_DEBATE", direction: OUT)
  }

  type Cargo @node {
    ds_cargo: String!
    debates: [Debate!]! @relationship(type: "REFERE_AO_CARGO", direction: IN)
  }

  type Ano @node {
    ano: Int!
    debates: [Debate!]! @relationship(type: "OCORRE_NO_ANO", direction: IN)
  }

  type Candidato @node {
    titulo_eleitoral: ID!
    nome: String
    discursos: [Speech!]! @relationship(type: "PROFERIU", direction: OUT)
    propostas: [Proposal!]! @relationship(type: "FEZ_PROPOSTA", direction: OUT)
    debates: [Debate!]! @relationship(type: "PARTICIPOU_DO_DEBATE", direction: OUT)
    perguntas_direcionadas: [Pergunta!]! @relationship(type: "DIRECIONADA_A", direction: IN)
  }

  type Speech @node {
    speech_id: ID!
    text: String
    start: Float
    end: Float
    relevance_score: Float
    relevance_justification: String
    autor: [Candidato!]! @relationship(type: "PROFERIU", direction: IN)
    debate: [Debate!]! @relationship(type: "TEM_DISCURSO", direction: IN)
    propostas: [Proposal!]! @relationship(type: "CONTEM_PROPOSTA", direction: OUT)
    respondeu_a: [Speech!]! @relationship(type: "RESPONDEU_A", direction: OUT)
    foi_respondido_por: [Speech!]! @relationship(type: "RESPONDEU_A", direction: IN)
    discussoes: [Discussao!]! @relationship(type: "FAZ_PARTE_DE", direction: OUT)
    temas: [Tema!]! @relationship(type: "ABORDOU_TEMA", direction: OUT)
    pergunta: [Pergunta!]! @relationship(type: "EH_PERGUNTA", direction: OUT)
  }

  type Proposal @node {
    proposal_id: ID!
    text: String
    candidato: [Candidato!]! @relationship(type: "FEZ_PROPOSTA", direction: IN)
    discursos: [Speech!]! @relationship(type: "CONTEM_PROPOSTA", direction: IN)
  }

  type Discussao @node {
    discussion_id: ID!
    discursos: [Speech!]! @relationship(type: "FAZ_PARTE_DE", direction: IN)
    debate: [Debate!]! @relationship(type: "CONTEM_DISCUSSAO", direction: IN)
  }

  type Tema @node {
    nome: ID!
    discursos: [Speech!]! @relationship(type: "ABORDOU_TEMA", direction: IN)
    debates: [Debate!]! @relationship(type: "ABORDOU_TEMA_DEBATE", direction: IN)
  }

  type Pergunta @node {
    pergunta_id: ID!
    discursos: [Speech!]! @relationship(type: "EH_PERGUNTA", direction: IN)
    direcionada_a: [Candidato!]! @relationship(type: "DIRECIONADA_A", direction: OUT)
  }
`;

// Variável global para manter a instância do servidor
let apolloServer = null;

async function getApolloServer() {
  if (!apolloServer) {
    const driver = getNeo4jDriver();

    // Criação do Schema do Neo4j
    const neoSchema = new Neo4jGraphQL({ 
      typeDefs, 
      driver 
    });

    const schema = await neoSchema.getSchema();

    // Inicialização do Apollo Server
    apolloServer = new ApolloServer({ 
      schema,
      introspection: true, // Permite introspection em desenvolvimento
    });
    
    // Inicia o servidor (necessário para Apollo Server v5)
    await apolloServer.start();
  }
  return apolloServer;
}

// Handler do Next.js para a rota GraphQL
export default async function graphqlHandler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const server = await getApolloServer();
    
    // Converte headers do Next.js para formato esperado pelo Apollo
    const headers = new Map();
    Object.keys(req.headers).forEach(key => {
      const value = req.headers[key];
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    // Para requisições GET (GraphQL Playground/Introspection)
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const result = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          body: null,
          headers,
          method: req.method,
          search: url.search,
        },
        context: async () => ({ req, res }),
      });

      if (result.kind === 'chunked') {
        res.status(result.status || 200);
        for await (const chunk of result.asyncIterator) {
          res.write(chunk);
        }
        res.end();
      } else {
        res.status(result.status || 200);
        res.setHeader('Content-Type', 'application/json');
        res.json(result.body);
      }
      return;
    }

    // Para requisições POST (queries/mutations GraphQL)
    const body = req.body || {};
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const result = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest: {
        body,
        headers,
        method: req.method,
        search: url.search,
      },
      context: async () => ({ req, res }),
    });

    if (result.kind === 'chunked') {
      res.status(result.status || 200);
      for await (const chunk of result.asyncIterator) {
        res.write(chunk);
      }
      res.end();
    } else {
      res.status(result.status || 200);
      res.setHeader('Content-Type', 'application/json');
      res.json(result.body);
    }
  } catch (error) {
    console.error('Error in GraphQL handler:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}