# WebApp - Debate Visualization Platform

A Next.js web application for exploring and visualizing electoral debate data. The application provides an interactive interface for browsing debates, analyzing discussions, and understanding political discourse through structured, accessible visualizations.

---

## 📋 Project Description

The WebApp serves as the frontend interface for the Termômetro Eleições platform. It connects to a Neo4j graph database (populated by the Pipeline application) to provide users with:

- **Debate browsing** - Search and filter debates by date, participants, and keywords
- **Discussion analysis** - View structured discussions with topic classifications and speech timelines
- **Proposal exploration** - Browse policy proposals extracted from candidate speeches
- **Interactive timelines** - Navigate through debates with video timestamps and speech events

The application is built with a focus on **accessibility, clarity, and civic engagement**, presenting political data in ways that are easy to understand and explore.

---

## 🎯 Project Vision

This project aims to **build a structured, open, and extensible data foundation for the analysis of political debates**, with a strong focus on **data engineering, data science, and natural language processing (NLP)**.

The original motivation came from a practical problem:  
while electoral debates contain rich information about political strategy, rhetoric, and policy proposals, **almost all of this data exists only as raw video**, making systematic analysis extremely difficult.

As a result, this project evolved into a full **end-to-end data pipeline and visualization platform** that transforms unstructured debate videos into structured, queryable data.

### Core Objectives

- **Transform raw debate videos into structured data**
  - Download and identify debate videos
  - Detect participants and debate metadata
  - Perform speaker diarization and transcription
  - Split speeches by candidate
  - Group speeches into coherent discussions
  - Classify questions, answers, and policy proposals using NLP and LLMs

- **Create a high-quality political debate database**
  - Store debates, discussions, speeches, and proposals in a graph database
  - Enable complex relationship-based queries (e.g. candidates, topics, interactions)
  - Serve as a foundation for advanced analyses

- **Enable deeper political analysis**
  - Topic frequency and evolution across campaigns
  - Rhetorical strategies and tone
  - Comparison of proposals across candidates
  - (Future) fact-checking and comparison between campaign promises and post-election performance

### Role of the Web Application

The WebApp is not just a visualization layer — it is a **data exploration tool** designed to:

- Expose the underlying data model in an intuitive way
- Allow users to explore debates, discussions, and speeches interactively
- Validate and iterate on the data model through real-world usage
- Serve as an entry point for researchers, developers, and journalists

The current visualization intentionally focuses on **clarity and inspectability**, helping users understand how debates are structured and how data flows from raw video to structured entities.

---

## ✨ Main Features

### Debate Browser

- **Search and filter** debates by:
  - Text search (title, description)
  - Date range
  - Participants (candidates)
- **Debate cards** showing:
  - Title and metadata
  - Average relevance scores
  - Number of discussions and participants

### Discussion Analysis

- **Structured discussions** grouped by topic
- **Speech timeline** with timestamps
- **Question-answer relationships** with relevance scoring
- **Topic classification** for each discussion

### Proposal Browser

- **Extracted policy proposals** from speeches
- **Linked to candidates** and original speeches
- **Searchable and filterable**

### Interactive Components

- **Video modals** for embedded YouTube content
- **Timeline panels** for navigating debate chronology
- **Battle arena** visualizations for comparing candidates

---

## 🛠️ Technologies and Frameworks

### Core Stack

- **Next.js 13** - React framework with server-side rendering and API routes
- **React 18** - UI library
- **Node.js 18+** - Runtime environment

### Data Layer

- **Neo4j GraphQL** - Auto-generated GraphQL schema from Neo4j data model
- **Apollo Server** - GraphQL server implementation
- **neo4j-driver** - Direct Neo4j database connectivity for REST endpoints

### UI/UX

- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library for smooth interactions
- **Lucide React** - Icon library

### Development Tools

- **Jest** - Testing framework
- **Prettier** - Code formatting

See `package.json` for the complete list of dependencies.

---

## 📁 Project Structure

```
WebApp/
├── components/                    # React components
│   ├── DebateCard.js             # Individual debate card component
│   ├── DebateFilterBar.js        # Search and filter controls
│   ├── DebateGrid.js             # Grid layout for debates
│   ├── DiscussionCard.js         # Discussion display component
│   ├── DiscussionTimelinePanel.js # Timeline visualization
│   ├── SpeechEvent.js            # Individual speech event component
│   ├── VideoModal.js             # YouTube video modal
│   ├── useDebates.js             # Custom hook for debate data
│   └── ...                       # Other components
├── pages/                        # Next.js pages and API routes
│   ├── index.js                  # Home page (debate browser)
│   ├── debate/[debateId]/        # Debate detail pages
│   ├── discussion/[discussionId]/ # Discussion detail pages
│   └── api/                      # API routes
│       └── v1/                   # API v1
│           ├── index.js          # GraphQL endpoint
│           ├── debates/          # Debates REST endpoint
│           ├── discussions/      # Discussions REST endpoint
│           ├── proposals/        # Proposals REST endpoint
│           └── status/           # API status endpoint
├── infra/                        # Infrastructure configuration
│   ├── compose.yaml              # Docker Compose for Neo4j
│   └── database.js               # Database connection utilities
├── assets/                       # Static assets
│   ├── images/                   # Image files
│   └── styles/                   # Global CSS
├── docs/                         # Documentation
│   └── api.mkd                   # GraphQL API documentation
└── tests/                        # Test files
```

---

## 🔧 Installation and Local Development

### Prerequisites

- **Node.js 18+** and **npm**
- **Access to Neo4j database** (can use Docker Compose setup or existing instance)

### Installation Steps

#### 1. Install Dependencies

```bash
cd WebApp
npm install
```

#### 2. Environment Variables

Create a `.env.local` file in the `WebApp` directory:

```env
# Neo4j Configuration
NEO4J_URL=bolt://localhost:7687
NEO4J_PASSWORD=password

# Optional: Node environment
NODE_ENV=development
```

**Note**: If using the Docker Compose setup (see below), the default password is `password`. Adjust according to your Neo4j configuration.

#### 3. Start Neo4j (if not already running)

Using Docker Compose (optional):

```bash
npm run services:up
```

This starts a Neo4j container using the configuration in `infra/compose.yaml`.

Alternatively, ensure you have access to a Neo4j instance (could be the same one used by the Pipeline).

#### 4. Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run services:up` | Start Neo4j with Docker Compose |
| `npm run services:down` | Stop Neo4j containers |
| `npm run services:stop` | Stop Neo4j containers (without removing) |
| `npm run lint:check` | Check code formatting |
| `npm run lint:fix` | Fix code formatting |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

---

## 🚀 Build and Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment Variables for Production

Ensure production environment variables are set:

- `NEO4J_URL` - Neo4j connection string
- `NEO4J_PASSWORD` - Neo4j password
- `NODE_ENV=production`

---

## 📡 API Architecture

The application provides two API layers:

### 1. GraphQL API (`/api/v1/`)

**Primary API** for flexible data queries. Auto-generated from Neo4j data model using Neo4j GraphQL library.

**Features:**
- Type-safe queries
- Relationship traversal
- GraphQL introspection (development only)
- Read-only (mutations disabled)

**Access:**
- Endpoint: `http://localhost:3000/api/v1/`
- GraphQL Playground: Available in development mode

**Main Types:**
- `debate` - Debate metadata and relationships
- `candidato` - Candidate information
- `fala` (speech) - Speech content and metadata
- `proposal` - Policy proposals
- `discussao` - Discussion groups
- `tema` - Topics/themes

See [API Documentation](./docs/api.mkd) for detailed schema information.

### 2. REST Endpoints

**Convenience endpoints** for common queries:

- `GET /api/v1/debates` - List all debates with filtering
- `GET /api/v1/discussions/[discussionId]` - Get discussion details
- `GET /api/v1/proposals` - List proposals
- `GET /api/v1/speeches` - List speeches
- `GET /api/v1/status` - API health check

---

## 🗄️ Database Connection

The application connects to Neo4j using the `neo4j-driver` package. Connection configuration is managed in `infra/database.js`:

```javascript
import { getNeo4jDriver } from '../infra/database';

const driver = getNeo4jDriver();
const session = driver.session();

// Use session for queries
await session.run('MATCH (d:Debate) RETURN d LIMIT 10');

await session.close();
```

**Connection Settings:**
- Configured via environment variables (`NEO4J_URL`, `NEO4J_PASSWORD`)
- Driver is singleton (reused across requests)
- Sessions should be closed after use

---

## 🎨 User Flow

1. **Homepage** (`/`)
   - Browse all debates
   - Filter by search, date, participants
   - View debate cards with metadata

2. **Debate Detail** (`/debate/[debateId]/discussions`)
   - View all discussions in a debate
   - Navigate to individual discussions

3. **Discussion Detail** (`/discussion/[discussionId]`)
   - View discussion timeline
   - See all speeches with timestamps
   - Navigate video moments

4. **Proposals** (via API or future page)
   - Browse extracted proposals
   - Link to source speeches

---

## 🧪 Testing

The project includes Jest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Test files are located in `tests/` directory.

---

## 📝 Code Style

The project uses Prettier for code formatting:

```bash
# Check formatting
npm run lint:check

# Fix formatting
npm run lint:fix
```

---

## 🔗 Integration with Pipeline

The WebApp reads data from the same Neo4j database populated by the Pipeline:

1. **Pipeline** processes debates and stores data in Neo4j
2. **WebApp** queries the same Neo4j database to display data
3. Both can use the same Neo4j instance or separate instances (with data replication)

**Important**: Ensure the Neo4j database is populated with debate data before using the WebApp. Run the Pipeline to process debates first.

---

## 🐛 Troubleshooting

### Common Issues

1. **Neo4j Connection Errors**
   - Verify Neo4j is running: `npm run services:up` or check existing instance
   - Verify `NEO4J_URL` and `NEO4J_PASSWORD` in `.env.local`
   - Check Neo4j is accessible at the configured URL

2. **GraphQL Schema Errors**
   - Ensure Neo4j database has the expected node labels and relationships
   - Check that Pipeline has successfully ingested debate data
   - Review `pages/api/v1/index.js` for schema definitions

3. **Build Errors**
   - Clear `.next` directory: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

---

## 📚 Additional Resources

- [GraphQL API Documentation](./docs/api.mkd) - Detailed API reference
- [Neo4j GraphQL Documentation](https://neo4j.com/docs/graphql/current/) - Official Neo4j GraphQL library docs
- [Next.js Documentation](https://nextjs.org/docs) - Next.js framework documentation

---

## ⚠️ Project Status

**This project is under active development** - features, objectives, and methodology are continuously evolving.
