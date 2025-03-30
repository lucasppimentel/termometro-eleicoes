import database from "infra/database";

// Estrutura de body planejada para GET:
// {
//   tabelas:{
//     falas: [
//       id_fala,
//       fala,
//       inicio,
//       fim
//     ],
//     debates: [
//       data_debate,
//       anfitriao
//     ]
//   },
//   filtros: {
//     debates: {
//       anfitriao=Lucas
//     }
//   }
// }

async function speaches(request, response) {
  if (request.method == "GET") {
    const { tabelas, filtros } = request.body;
    let userQuery = filtros
      ? database.buildQuery(tabelas, filtros)
      : database.buildQuery(tabelas);

    const userData = await database.query(userQuery);

    // const userData = await database.query(request.body);

    return response
      .status(200)
      .json({ body: tabelas, query: userQuery, data: userData.rows });
  }

  if (request.method == "POST") {
    // Adicionar dados no banco

    const { tabela, colunas } = request.body;
    const userQuery = await database.buildPostQuery(tabela, colunas);

    const userResponse = await database.query(userQuery);

    return response
      .status(200)
      .json({ query: userQuery, response: userResponse });
  }

  if (request.method == "PUT") {
    // Atualizar entrada no banco de dados

    return response.status(200).json({ test: "test" });
  }

  if (request.method == "DELETE") {
    // Deletar entrada no banco de dados

    return response.status(200).json({ test: "test" });
  }

  return response.status(405);
}

export default speaches;
