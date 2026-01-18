# ScraperDebates

Projeto para processamento e análise de debates eleitorais, extraindo transcrições, identificando candidatos, classificando discursos e armazenando tudo em um banco de dados Neo4j.

---

## 📁 Estrutura dos Arquivos

```
.
├── Database
│   └── Candidatos
│       └── **.csv
├── src
│   ├── database.py
│   ├── debate_processer.py
│   ├── my_utils.py
│   └── prompts.py.py
├── .env_example
├── .gitignore
├── .docker-compose.yml
├── Dockerfile
├── main.ipynb
├── README.md
└── requirements.txt
```

| File Name | Details 
|------------|-------|
| Database/ | Contém os dados brutos dos candidatos e outros arquivos auxiliares.
| Dockerfile | Instruções para construção da imagem do jupyter notebook
| main.ipynb | Ponto de entrada do projeto. Executa o processamento dos debates, faz a ingestão dos dados e interage com o banco Neo4j.
| requirements.txt | Lista de dependências Python necessárias para rodar o projeto.
| src/debate_processer.py | Classe principal para processamento dos debates: download, transcrição, identificação de candidatos, classificação e ingestão no banco.
| src/my_utils.py | Funções utilitárias para manipulação de arquivos, download de áudio, transcrição, etc.
| src/prompts.py | Templates de prompts utilizados para interagir com modelos de linguagem (LLMs).
| src/database.py | Classe e funções para conexão e operações com o banco Neo4j.

## ▶️ Como Rodar

### 1. Variáveis de Ambiente
Copie o arquivo .env_example, cole e renomeie para .env.
Atualize as variáveis de acordo com sua utilização, altere **4J_URL** <container_name> para o nome do container neo4j e altere as variáveis **OPENAI_API_KEY** e **HF_API_KEY** com suas respectivas chaves.

### 2. Instale as extensões no VSCode (opcional)
Caso queira utilizar o notebook do jupyter dentro do VSCode, instale as extensões:
- Dev Container - Microsoft
- Jupyter - Microsoft

### 3. Rode o docker compose
No terminal:
```
docker compose up
```

### 4. Acessando o notebook via browser
Após rodar o docker compose up, nos logs do container **jupyter** será exibido uma URL com token na porta 8888 (ex: **http://127.0.0.1:8888/tree?token=...**), copie essa URL e cole no navegador para acessar o notebook ou CTRL + Click na URL para abri-la diretamente no navegador padrão.

### 5. Acessando o notebook via VSCode
1. Abra o arquivo main.ipynb
2. No canto superior direito clique em "Select Kernel"
3. Clique em "Select Another Kernel"
4. Clique em "Existing Jupyter Server"
5. Copie a URL da mesma forma que no passo 4 e cole na aba aberta do VSCode, confirme com ENTER
6. Defina um nome ou deixe em branco na proxima aba, confirme com ENTER
7. Selecione o Jupyter Server que vai aparecer na última aba

