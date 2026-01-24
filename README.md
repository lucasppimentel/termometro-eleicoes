# Termômetro Eleições

A comprehensive platform for processing, analyzing, and visualizing electoral debates in Brazil. This repository contains two independent applications that work together to transform raw debate video content into structured, searchable data and interactive visualizations.

---

## 📋 Project Overview

**Termômetro Eleições** (Elections Thermometer) is designed to make electoral debates more accessible and understandable for Brazilian citizens. The platform processes debate videos from YouTube, extracts structured information about candidates, their speeches, proposals, and discussions, then presents this data through an intuitive web interface.

The repository consists of two main components:

1. **Pipeline** - An ETL (Extract, Transform, Load) system that processes debate videos
2. **WebApp** - A Next.js web application that visualizes and explores the processed debate data

### Purpose

The project aims to:
- **Extract structured information** from electoral debate videos using AI-powered transcription and analysis
- **Identify candidates** and link their statements to official electoral data
- **Analyze discourse** by extracting proposals, classifying speech types, and detecting discussion threads
- **Present data accessibly** through an interactive web interface that helps citizens understand political discourse

And by doing that, we should be able to create a structured database about politicians that enables higher level analysis involving strategy, proposals, and performance while elected, fact-checking, and others.

---

## 🗂️ Repository Structure

```
termometro-eleicoes/
├── Pipeline/              # ETL pipeline for processing debates
│   ├── docs/              # Markdowns with documentation of specific logics
│   ├── data/              # Folder with persisted data from the database
│   │   ├──candidates/*    # Candidate data files (CSV)
│   │   ├──downloads/*     # Pipeline execution saves
│   │   ├──neo4j.dump      # neo4j database setup data (contains data from candidates and Video ID: 8v6ruFkdKHU)
│   │   └──system.dump     # neo4j system database setup data
│   ├── src/               # Python source code
│   ├── main.ipynb         # Jupyter notebook entry point
│   ├── docker-compose.yml # Docker setup for pipeline services
│   └── requirements.txt   # Python dependencies
│
└── WebApp/                # Next.js web application
    ├── docs/              # Markdowns with documentation of specific logics
    ├── components/        # React components
    ├── pages/             # Next.js pages and API routes
    ├── infra/             # Infrastructure configuration
    ├── assets/            # Static assets
    └── package.json       # Node.js dependencies
```

### Key Directories

- **Pipeline/** - Contains the Python-based ETL pipeline that downloads, transcribes, and processes debate videos
- **WebApp/** - Contains the Next.js React application with GraphQL API for querying and visualizing debate data

---

## 🚀 Applications Summary

### Pipeline

A Python-based ETL pipeline that processes electoral debate videos through multiple stages:

- **Extraction**: Downloads video and audio from YouTube
- **Transcription**: Uses Whisper AI for speech-to-text conversion
- **Speaker Diarization**: Identifies and separates different speakers using pyannote.audio
- **Candidate Identification**: Matches speakers with official candidate data using fuzzy matching
- **Content Analysis**: Uses LLMs (OpenAI) to extract proposals, classify speeches, and analyze discussion coherence
- **Data Storage**: Stores structured data in Neo4j graph database

**Technologies**: Python, Jupyter Notebooks, Whisper, LangChain, OpenAI API, Neo4j, Docker

[→ View Pipeline Documentation](./Pipeline/README.md)

### WebApp

A Next.js web application that provides an interactive interface for exploring debate data:

- **Debate Browser**: Search and filter debates by date, participants, and keywords
- **Discussion Analysis**: View structured discussions with topic classifications
- **Speech Timeline**: Navigate through candidate speeches with timestamps
- **Proposal Extraction**: Browse policy proposals extracted from speeches
- **GraphQL API**: Flexible API layer built with Apollo Server and Neo4j GraphQL

**Technologies**: Next.js, React, GraphQL, Apollo Server, Neo4j GraphQL, Tailwind CSS, Framer Motion

[→ View WebApp Documentation](./WebApp/README.md)

---

## 🔗 How They Work Together

The Pipeline and WebApp are designed to work in sequence:

1. **Pipeline** processes debate videos and stores structured data in Neo4j
2. **WebApp** connects to the same Neo4j database to query and visualize the processed data
3. Both applications can run independently but share the same database instance

**Note**: The applications are designed to be run separately, each with its own setup and dependencies. They communicate through the shared Neo4j database.

---

## 📦 Prerequisites

### For Pipeline

- Python 3.10+
- Docker and Docker Compose
- OpenAI API key
- Hugging Face API token (for speaker diarization)

### For WebApp

- Node.js 18+ and npm
- Access to Neo4j database (can be shared with Pipeline or separate instance)

---

## 🏃 Quick Start

### Pipeline

```bash
cd Pipeline
# Copy .env_example to .env and configure API keys
docker compose up
# Access Jupyter notebook at http://localhost:8888
```

See [Pipeline README](./Pipeline/README.md) for detailed setup instructions.

### WebApp

```bash
cd WebApp
npm install
npm run services:up  # Start Neo4j (if not already running)
npm run dev          # Start development server at http://localhost:3000
```

See [WebApp README](./WebApp/README.md) for detailed setup instructions.

---

## 📝 Documentation

- [Pipeline Documentation](./Pipeline/README.md) - ETL pipeline setup, configuration, and usage
- [WebApp Documentation](./WebApp/README.md) - Web application setup, features, and development guide
- [API Documentation](./WebApp/docs/api.mkd) - GraphQL API reference (in WebApp)

---

## 🤝 Contributing

This project is in active development. Contributions and feedback are welcome.

---

## 📄 License

See [LICENSE](./WebApp/LICENSE) file for details (MIT License).

---

## ⚠️ Status

**This project is under active development** - features, objectives, and methodology are continuously evolving.

