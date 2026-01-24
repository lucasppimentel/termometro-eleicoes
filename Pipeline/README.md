# Pipeline - Debate Processing ETL

A Python-based ETL pipeline for processing electoral debate videos. This pipeline extracts, transcribes, analyzes, and structures debate content from YouTube videos, then stores the processed data in a Neo4j graph database.

---

## 📋 Project Description

The Pipeline processes electoral debate videos through multiple stages:

1. **Video Download** - Downloads video and audio from YouTube
2. **Transcription** - Converts speech to text using OpenAI Whisper
3. **Speaker Diarization** - Identifies and separates different speakers using pyannote.audio
4. **Candidate Identification** - Matches speakers with official candidate data using fuzzy matching
5. **Content Analysis** - Uses LLMs to extract proposals, classify speech types, and analyze discussion coherence
6. **Data Ingestion** - Stores structured data in Neo4j with relationships between debates, candidates, speeches, proposals, and discussions

---

## 🔄 ETL Flow

The pipeline follows this processing flow:

```
YouTube Video
    ↓
Download Audio
    ↓
Transcribe (Whisper)
    ↓
Speaker Diarization (pyannote.audio)
    ↓
Identify Candidates (LLM + Fuzzy Matching)
    ↓
Segment Speeches
    ↓
Extract Proposals (LLM)
    ↓
Classify Speech Types (Zero-shot Classification)
    ↓
Group Discussions (Graph-based clustering)
    ↓
Analyze Coherence (LLM)
    ↓
Ingest into Neo4j
```

### Detailed Process

1. **Download & Transcribe**: Extracts audio from YouTube and transcribes using Whisper AI
2. **Speaker Identification**: Uses LLM to identify speaker names from an initial sample, then matches them with candidate database records
3. **Diarization**: Assigns transcribed segments to identified speakers
4. **Speech Segmentation**: Groups continuous segments from the same speaker into coherent speeches
5. **Content Extraction**: 
   - Extracts policy proposals from speeches using LLM
   - Classifies speech types (proposal, attack, defense, etc.) using zero-shot classification
6. **Discussion Analysis**: 
   - Groups speeches into discussions based on topic similarity
   - Identifies questions and responses
   - Analyzes coherence and relevance of responses
7. **Database Ingestion**: Stores all data in Neo4j with appropriate nodes and relationships

---

## 🛠️ Technologies and Libraries

### Core Technologies

- **Python 3.9+** - Main programming language
- **Jupyter Notebooks** - Interactive execution environment
- **Docker** - Containerized execution environment

### Key Libraries

- **Whisper** - Speech-to-text transcription
- **pyannote.audio** - Speaker diarization
- **LangChain** - LLM orchestration framework
- **OpenAI API** - Language model for content analysis
- **Neo4j** - Graph database for data storage
- **sentence-transformers** - Text embeddings for similarity matching
- **thefuzz** - Fuzzy string matching for candidate identification
- **pandas** - Data manipulation
- **networkx** - Graph algorithms for discussion grouping

See `requirements.txt` for the complete list of dependencies.

---

## 📁 Project Structure

```
Pipeline/
│   ├── docs/                             # Markdowns with documentation of specific logics
│   ├── data/                             # Folder with persisted data from the database
│   │   ├──candidates/*                   # Candidate data files (CSV)
│   │   ├──downloads/*                    # Pipeline execution saves
│   │   ├──neo4j.dump                     # neo4j database setup data (contains data from candidates and Video ID: 8v6ruFkdKHU)
│   │   └──system.dump                    # neo4j system database setup data
├── src/
│   ├── database.py                       # Neo4j database operations
│   ├── debate_processer.py               # Main processing class
│   ├── my_utils.py                       # Utility functions (download, transcription, etc.)
│   └── prompts.py                        # LLM prompt templates
├── main.ipynb                            # Jupyter notebook entry point
├── docker-compose.yml                    # Docker Compose configuration
├── Dockerfile                            # Docker image definition
├── requirements.txt                      # Python dependencies
└── README.md                             # This file
```

### File Descriptions

| File | Description |
|------|-------------|
| `main.ipynb` | Main entry point. Executes debate processing pipeline and data ingestion into Neo4j |
| `src/debate_processer.py` | Core processing class: handles download, transcription, speaker identification, classification, and discussion analysis |
| `src/database.py` | Neo4j database connection and operations. Handles candidate data ingestion and debate data storage |
| `src/my_utils.py` | Utility functions for audio download, transcription, file operations, and string matching |
| `src/prompts.py` | Prompt templates for LLM interactions (candidate identification, proposal extraction, coherence analysis, etc.) |
| `Database/Candidatos/` | Contains CSV files with official candidate data from TSE (Brazilian Electoral Court) |

---

## 🔧 Environment Setup

### Prerequisites

- **Python 3.9+**
- **Docker** and **Docker Compose**
- **OpenAI API Key** - Required for LLM-based content analysis
- **Hugging Face API Token** - Required for speaker diarization model access

### Installation Steps

#### 1. Clone the Repository

Ensure you're in the `Pipeline` directory.

#### 2. Environment Variables

Create a `.env` file in the `Pipeline` directory (you can copy from `.env_example` if it exists):

```env
# Neo4j Configuration
4J_URL=bolt://neo4j:7687

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Hugging Face API
HF_API_KEY=your_huggingface_token_here
```

**Important**: 
- Update `4J_URL` with the correct Neo4j container name (if using Docker Compose, it should be `neo4j`)
- Add your actual OpenAI API key
- Add your Hugging Face API token (get it from https://huggingface.co/settings/tokens)

#### 3. Install Python Dependencies

If running locally (not in Docker):

```bash
pip install -r requirements.txt
```

Alternatively, dependencies are installed automatically when building the Docker image.

#### 4. Download Required Data Files

Some data files were stored in Google Drive due to their size. They are used to create a neo4j database that already has data from candidates of the state of São Paulo, and the data from one debate (8v6ruFkdKHU). Download them using the provided script (or just access the Drive and add them manually):

```bash
python download_data.py
```

This will download:
- `data/neo4j.dump` - Neo4j database dump with pre-loaded candidate data
- `data/system.dump` - Neo4j system database dump
- `data/candidates/consulta_cand_2024_SP.csv` - Candidate data CSV file

**Note**: The script will skip files that already exist, so you can safely run it multiple times.

#### 5. Prepare Candidate Data (Alternative)

If you prefer to use your own candidate data, ensure CSV files are placed in `data/candidates/`. The pipeline expects TSE (Brazilian Electoral Court) format CSV files with candidate information. Running `database_startup()` can be used to setup the database with your own data.

---

## 🚀 How to Run

### Option 1: Using Docker Compose (Recommended)

This is the recommended approach as it handles all dependencies and service orchestration.

#### 1. Start Services

```bash
docker compose up
```

This will:
- Start a Neo4j database container
- Build and start a Jupyter notebook container with all dependencies

#### 2. Access Jupyter Notebook

After starting, check the container logs for the Jupyter URL with token:

```bash
docker compose logs jupyter
```

Look for a line like:
```
http://127.0.0.1:8888/tree?token=...
```

Open this URL in your browser.

#### 3. Access Neo4j Browser (Optional)

Neo4j is available at:
- **Browser UI**: http://localhost:7474
- **Bolt Protocol**: bolt://localhost:7687

Default credentials (from `docker-compose.yml`):
- Username: `neo4j`
- Password: `strongpassword`

### Option 2: Local Development (VS Code)

If you prefer to use VS Code with Jupyter extension:

#### 1. Install VS Code Extensions

- **Dev Containers** - Microsoft
- **Jupyter** - Microsoft

#### 2. Start Docker Compose

```bash
docker compose up
```

#### 3. Connect to Jupyter Server in VS Code

1. Open `main.ipynb` in VS Code
2. Click "Select Kernel" in the top right
3. Select "Select Another Kernel"
4. Choose "Existing Jupyter Server"
5. Paste the Jupyter URL from the Docker logs (with token)
6. Confirm and select the server

---

## 💻 Usage

### Basic Workflow

1. **Initialize Database** (First time only):
   ```python
   from src.database import Neo4jDatabase
   import pandas as pd
   
   df = pd.read_csv('Database/Candidatos/consulta_cand_2024_SP.csv', encoding='latin1', sep=';')
   db = Neo4jDatabase()
   db.start_database(df)  # Ingest candidate data
   ```

2. **Process a Debate**:
   ```python
   from src.debate_processer import DebateProcesser
   
   video_id = "YOUTUBE_VIDEO_ID"
   pc = DebateProcesser(video_id=video_id, database=db)
   
   # Execute pipeline steps
   pc.download_and_transcribe()
   pc.identify_video_info()
   pc.identify_speakers()
   pc.diarize_speakers()
   pc.get_proposals()
   pc.calculate_discussions()
   
   # Ingest into database
   pc.ingest_discussion_data()
   ```

### Pipeline Steps

The main processing steps in `main.ipynb`:

1. **`download_and_transcribe()`** - Downloads audio and creates transcript
2. **`identify_video_info()`** - Extracts debate metadata (location, position, date)
3. **`identify_speakers()`** - Identifies participants using LLM
4. **`diarize_speakers()`** - Assigns transcript segments to speakers
5. **`get_proposals()`** - Extracts policy proposals from speeches
6. **`calculate_discussions()`** - Groups speeches into discussion threads
7. **`ingest_discussion_data()`** - Stores all data in Neo4j

---

## ⚙️ Configuration and Environment Variables

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `4J_URL` | Neo4j database connection URL | `bolt://neo4j:7687` |
| `OPENAI_API_KEY` | OpenAI API key for LLM operations | `sk-...` |
| `HF_API_KEY` | Hugging Face token for model access | `hf_...` |

### Pipeline Configuration

You can customize processing behavior in `DebateProcesser.__init__()`:

- **`sample_length`** (default: 2100 seconds) - Length of sample used for speaker identification
- **`debate_start`** (default: 0) - Start time in seconds (to skip intros, etc.)
- **`speech_max_pause`** (default: 20 seconds) - Maximum pause between segments to merge into one speech

---

## 📊 Data Model

The pipeline creates the following Neo4j structure:

### Nodes

- **Debate** - Debate metadata (title, date, location, position)
- **Candidato** - Candidate information from TSE
- **Speech** - Individual speeches with timestamps
- **Proposal** - Extracted policy proposals
- **DISCUSSAO** - Discussion groups
- **TEMA** - Topics/themes
- **Eleicao**, **Cargo**, **Ano** - Electoral context nodes

### Relationships

- `PARTICIPOU_DO_DEBATE` - Links candidates to debates
- `PROFERIU` - Links candidates to speeches
- `FEZ_PROPOSTA` - Links candidates to proposals
- `RESPONDEU_A` - Links response speeches to questions
- `FAZ_PARTE_DE` - Links speeches to discussions
- `ABORDOU_TEMA` - Links speeches to topics

---

## 🐛 Troubleshooting

### Common Issues

1. **Neo4j Connection Errors**
   - Verify Neo4j container is running: `docker compose ps`
   - Check `4J_URL` matches container name in `docker-compose.yml`

2. **API Key Errors**
   - Verify `.env` file exists and contains valid API keys
   - Ensure environment variables are loaded (check `dotenv.load_dotenv()`)

3. **Speaker Diarization Fails**
   - Verify Hugging Face token has access to `pyannote/speaker-diarization-3.1`
   - Check token is valid at https://huggingface.co/settings/tokens

4. **Candidate Matching Issues**
   - Ensure candidate CSV file is in correct format
   - Verify database has been initialized with candidate data

---

## 📝 Notes

- The pipeline uses checkpoints (pickle files) to cache intermediate results, allowing you to resume processing after interruptions
- Processing can take significant time depending on video length and API rate limits
- GPU is recommended for faster transcription and diarization (automatically used if available)
