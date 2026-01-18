import pandas as pd
from neo4j import GraphDatabase
import os
import dotenv
dotenv.load_dotenv()


class Neo4jDatabase:
    def __init__(self, batch_size=1000):
        uri = os.getenv("4J_URL")
        user = os.getenv("4J_USER")
        password = os.getenv("4J_PASSWORD")

        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size  # Tamanho do lote para inserção em massa


    def close(self):
        self.driver.close()

    def clear_database(self):
        with self.driver.session() as session:
            print("========== EXCLUINDO DADOS ==========")

            # Apaga todos os relacionamentos e nós
            session.run("MATCH (n) DETACH DELETE n")
            print("Todos os nós e relacionamentos foram removidos.")

            # Apaga todos os constraints e índices
            constraints = session.run("SHOW CONSTRAINTS")
            for record in constraints:
                name = record["name"]
                session.run(f"DROP CONSTRAINT {name}")
                print(f"Constraint '{name}' removido.")

            indexes = session.run("SHOW INDEXES")
            for record in indexes:
                name = record["name"]
                session.run(f"DROP INDEX {name}")
                print(f"Índice '{name}' removido.")

        print("Banco limpo com sucesso!")


    def ingest_data_to_neo4j(self, df):
        query = """
        UNWIND $rows AS row
        
        // Nó do candidato
        MERGE (c:Candidato {titulo_eleitoral: row.NR_TITULO_ELEITORAL_CANDIDATO})
        SET c.nome = row.NM_CANDIDATO,
            c.nome_urna = row.NM_URNA_CANDIDATO,
            c.nome_social = row.NM_SOCIAL_CANDIDATO,
            c.email = row.DS_EMAIL,
            c.data_nascimento = row.DT_NASCIMENTO,
            c.genero = row.DS_GENERO,
            c.nr_candidato = row.NR_CANDIDATO,
            c.nr_cpf = row.NR_CPF_CANDIDATO

        // Nó da eleição
        MERGE (e:Eleicao {cd_eleicao: row.CD_ELEICAO, nr_turno: row.NR_TURNO, ue:row.SG_UE, uf: row.SG_UF})
        SET e.ds_eleicao = row.DS_ELEICAO,
            e.nm_tipo = row.NM_TIPO_ELEICAO,
            e.tp_abrangencia = row.TP_ABRANGENCIA,
            e.dt_eleicao = row.DT_ELEICAO,
            e.nm_ue = row.NM_UE

        // Nó do cargo
        MERGE (cg:Cargo {cd_cargo: row.CD_CARGO})
        SET cg.ds_cargo = row.DS_CARGO

        // Nó do ano
        MERGE (a:Ano {ano: row.ANO_ELEICAO})

        // Relacionamentos
        MERGE (c)-[:DISPUTA]->(e)
        MERGE (c)-[:CONCORRE_AO]->(cg)
        MERGE (e)-[:OCORRE_NO_ANO]->(a)
        """

        with self.driver.session() as session:
            # constraints
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Candidato) REQUIRE c.titulo_eleitoral IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Eleicao) REQUIRE (e.cd_eleicao, e.nr_turno, e.ue, e.uf) IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (cg:Cargo) REQUIRE cg.cd_cargo IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Ano) REQUIRE a.ano IS UNIQUE"
            )

            # batches
            for i in range(0, len(df), self.batch_size):
                batch = df.iloc[i:i+self.batch_size].where(pd.notnull(df), None).to_dict("records")
                session.run(query, rows=batch)
            
            session.run("MERGE (c:Candidato {titulo_eleitoral: 0}) SET c.nome = 'NÃO CANDIDATO'")
        print("Dados inseridos com sucesso!")

    def get_all_cargos(self):
        """
        Obtém uma lista de todos os cargos distintos no banco de dados.
        """
        query = "MATCH (c:Cargo) RETURN DISTINCT c.ds_cargo AS cargo"
        
        with self.driver.session() as session:
            result = session.run(query)
            # Retorna uma lista de strings, uma para cada cargo
            return [record["cargo"] for record in result]

    def start_database(self, df):
        self.clear_database()
        self.ingest_data_to_neo4j(df)