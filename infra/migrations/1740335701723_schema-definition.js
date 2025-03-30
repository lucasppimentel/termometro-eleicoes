/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar schema se não existir
  // pgm.createSchema("eleicoes", { ifNotExists: true });

  // Criar a tabela de interlocutores
  pgm.createTable("interlocutores", {
    id_interlocutor: { type: "serial", primaryKey: true },
    nome_interlocutor: { type: "text", notNull: true },
  });

  // Criar a tabela de debates
  pgm.createTable("debates", {
    id_debate: { type: "serial", primaryKey: true },
    duracao: { type: "integer", notNull: true },
    data_debate: { type: "date", notNull: true },
    anfitriao: { type: "text", notNull: true },
  });

  // Criar a tabela de classificações
  pgm.createTable("classificacoes", {
    id_classificacao: { type: "serial", primaryKey: true },
    nome_classificacao: { type: "text", notNull: true, unique: true },
  });

  // Criar a tabela de falas
  pgm.createTable("falas", {
    id_fala: { type: "serial", primaryKey: true },
    id_interlocutor: {
      type: "integer",
      notNull: true,
      references: "interlocutores",
      onDelete: "CASCADE",
    },
    id_debate: {
      type: "integer",
      notNull: true,
      references: "debates",
      onDelete: "CASCADE",
    },
    id_classificacao: {
      type: "integer",
      references: "classificacoes",
      onDelete: "SET NULL",
    },
    fala: { type: "text", notNull: true },
    inicio: { type: "integer", notNull: true },
    fim: { type: "integer", notNull: true },
  });

  // Criar índices para otimizar as buscas
  pgm.createIndex("falas", "id_interlocutor");
  pgm.createIndex("falas", "id_debate");
  pgm.createIndex("falas", "id_classificacao");
};

exports.down = (pgm) => {};
