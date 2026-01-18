import { ApolloServer } from '@apollo/server';
import { Neo4jGraphQL } from "@neo4j/graphql";
import { GraphQLSchema } from "graphql";
import { getNeo4jDriver } from "../../../infra/database";

// Definição completa do Schema GraphQL baseado na estrutura do banco Neo4j
const typeDefs = `#graphql
  type debate @node (labels: ["Debate"]) {
    debate_id: ID!
    title: String
    date: String
    cargo: String
    municipio: String
    estado: String
    cargo_relacionado: [cargo!]! @relationship(type: "REFERE_AO_CARGO", direction: OUT)
    ano: [ano!]! @relationship(type: "OCORRE_NO_ANO", direction: OUT)
    candidatos: [candidato!]! @relationship(type: "PARTICIPOU_DO_DEBATE", direction: IN)
    discursos: [fala!]! @relationship(type: "TEM_DISCURSO", direction: OUT)
    discussoes: [discussao!]! @relationship(type: "CONTEM_DISCUSSAO", direction: OUT)
    temas: [tema!]! @relationship(type: "ABORDOU_TEMA_DEBATE", direction: OUT)
  }

  type cargo @node (labels: ["Cargo"]) {
    ds_cargo: String!
    debates: [debate!]! @relationship(type: "REFERE_AO_CARGO", direction: IN)
  }

  type ano @node (labels: ["Ano"]) {
    ano: Int!
    debates: [debate!]! @relationship(type: "OCORRE_NO_ANO", direction: IN)
  }

  type candidato @node (labels: ["Candidato"]) @plural(value: "candidatos") {
    titulo_eleitoral: ID!
    nome: String
    discursos: [fala!]! @relationship(type: "PROFERIU", direction: OUT)
    propostas: [proposal!]! @relationship(type: "FEZ_PROPOSTA", direction: OUT)
    debates: [debate!]! @relationship(type: "PARTICIPOU_DO_DEBATE", direction: OUT)
  }

  type fala @node (labels: ["Speech"]) {
    speech_id: ID!
    text: String
    start: Float
    end: Float
    relevance_score: Float
    relevance_justification: String
    autor: [candidato!]! @relationship(type: "PROFERIU", direction: IN)
    debate: [debate!]! @relationship(type: "TEM_DISCURSO", direction: IN)
    propostas: [proposal!]! @relationship(type: "CONTEM_PROPOSTA", direction: OUT)
    respondeu_a: [fala!]! @relationship(type: "RESPONDEU_A", direction: OUT)
    foi_respondido_por: [fala!]! @relationship(type: "RESPONDEU_A", direction: IN)
    discussoes: [discussao!]! @relationship(type: "FAZ_PARTE_DE", direction: OUT)
    temas: [tema!]! @relationship(type: "ABORDOU_TEMA", direction: OUT)
  }

  type proposal @node (labels: ["Proposta"]) {
    proposal_id: ID!
    text: String
    candidato: [candidato!]! @relationship(type: "FEZ_PROPOSTA", direction: IN)
    discursos: [fala!]! @relationship(type: "CONTEM_PROPOSTA", direction: IN)
  }

  type discussao @node (labels: ["DISCUSSAO"]) {
    discussion_id: ID!
    discursos: [fala!]! @relationship(type: "FAZ_PARTE_DE", direction: IN)
    debate: [debate!]! @relationship(type: "CONTEM_DISCUSSAO", direction: IN)
  }

  type tema @node (labels: ["TEMA"]) {
    nome: ID!
    discursos: [fala!]! @relationship(type: "ABORDOU_TEMA", direction: IN)
    debates: [debate!]! @relationship(type: "ABORDOU_TEMA_DEBATE", direction: IN)
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

    let schema = await neoSchema.getSchema();

    // Remove mutations do schema para garantir que apenas queries sejam permitidas
    const mutationType = schema.getMutationType();
    if (mutationType) {
      // Cria um novo schema sem o tipo Mutation
      const queryType = schema.getQueryType();
      schema = new GraphQLSchema({
        query: queryType,
        // Mutation e Subscription não são incluídos - apenas leitura
      });
    }

    // Introspection apenas em desenvolvimento
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Inicialização do Apollo Server
    apolloServer = new ApolloServer({ 
      schema,
      introspection: isDevelopment, // Apenas em desenvolvimento
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

    // Para requisições POST (queries GraphQL - mutations são bloqueadas)
    const body = req.body || {};
    
    // Bloqueia mutations como medida de segurança adicional
    if (body.operationName || (body.query && body.query.includes('mutation'))) {
      // Verifica se é uma mutation pela operação ou pela query
      const isMutation = body.operationName?.toLowerCase().includes('mutation') ||
                        (body.query && /mutation\s+\w*\{/i.test(body.query));
      
      if (isMutation) {
        return res.status(403).json({ 
          error: 'Mutations are not allowed. This API is read-only.' 
        });
      }
    }
    
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