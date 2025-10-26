import React, { useState, useEffect, useCallback } from "react";

// --- Funções de Fetch para os Endpoints ---

// Simula a busca de dados de /api/v1/proposals
const fetchProposals = async () => {
  // Substitua esta URL pela URL real do seu backend
  const endpointUrl = "/api/v1/proposals";

  const response = await fetch(endpointUrl);
  if (!response.ok) {
    throw new Error(`Erro ao carregar propostas: ${response.statusText}`);
  }
  return response.json();
};

// Simula a busca de dados de /api/v1/speeches
const fetchSpeeches = async () => {
  // Substitua esta URL pela URL real do seu backend
  const endpointUrl = "/api/v1/speeches";

  const response = await fetch(endpointUrl);
  if (!response.ok) {
    throw new Error(`Erro ao carregar discursos: ${response.statusText}`);
  }
  return response.json();
};

// Componente principal
export default function DebateScreen() {
  const [proposals, setProposals] = useState([]);
  const [speechesMap, setSpeechesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVideo, setCurrentVideo] = useState({
    youtubeId: null,
    startTime: 0,
    debateTitle: "Selecione uma Proposta para Iniciar o Vídeo",
  });

  // Função para carregar e correlacionar todos os dados
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Busca os dois endpoints em paralelo
      const [proposalsData, speechesData] = await Promise.all([
        fetchProposals(),
        fetchSpeeches(),
      ]);

      // 1. Criar o Mapa de Discursos (speech_id -> debate info)
      const map = {};
      speechesData.forEach((speech) => {
        map[speech.speech_id] = {
          youtubeId: speech.debate.debate_id,
          debateTitle: speech.debate.title,
        };
      });
      setSpeechesMap(map);
      setProposals(proposalsData);

      // 2. Inicializar o player com a primeira proposta encontrada
      if (proposalsData.length > 0) {
        const firstProposal = proposalsData[0];
        const info = map[firstProposal.speech.speech_id];

        if (info) {
          setCurrentVideo({
            youtubeId: info.youtubeId,
            startTime: Math.floor(firstProposal.speech.start),
            debateTitle: info.debateTitle,
          });
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados dos debates:", err);
      setError(
        "Não foi possível carregar os dados. Tente novamente mais tarde.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Função que é executada ao clicar em uma proposta.
   */
  const handleProposalClick = (proposal) => {
    const speechId = proposal.speech.speech_id;
    const info = speechesMap[speechId];

    if (info) {
      const startTimeInSeconds = Math.floor(proposal.speech.start);

      setCurrentVideo({
        youtubeId: info.youtubeId,
        startTime: startTimeInSeconds,
        debateTitle: info.debateTitle,
      });
    } else {
      console.error(
        `Informação do debate não encontrada para speech_id: ${speechId}`,
      );
      // Poderia adicionar feedback visual de erro aqui
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando dados dos debates...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      {/* Coluna 1: Lista de Propostas */}
      <div style={styles.listColumn}>
        <h2>Propostas Apresentadas</h2>
        {proposals.map((proposal, index) => (
          <ProposalItem
            key={proposal.proposal_id + index}
            proposal={proposal}
            onClick={() => handleProposalClick(proposal)}
          />
        ))}
        {proposals.length === 0 && <p>Nenhuma proposta encontrada.</p>}
      </div>

      {/* Coluna 2: Player do YouTube */}
      <div style={styles.videoColumn}>
        <YouTubePlayer currentVideo={currentVideo} />
      </div>
    </div>
  );
}

// --- Componente de Item da Proposta ---
const ProposalItem = ({ proposal, onClick }) => {
  let proposalTexts;
  try {
    proposalTexts = JSON.parse(proposal.text);
  } catch (e) {
    proposalTexts = ["Erro ao ler propostas"];
  }

  // Remove os colchetes e espaços em branco do início/fim do trecho do discurso.
  // RegEx /^\s*\[|\]\s*$/g remove colchetes e espaços nas extremidades
  const speechSnippet = proposal.speech.text
    .trim()
    .replace(/^\s*\[|\]\s*$/g, "");

  return (
    <div style={styles.proposalCard} onClick={onClick}>
      <p style={styles.candidateName}>
        Candidato(a): <strong>{proposal.speech.candidato.nome_urna}</strong>
      </p>

      {/* Propostas em lista */}
      <ul style={styles.proposalList}>
        {proposalTexts.slice(0, 2).map((text, i) => (
          <li key={i}>{text}</li>
        ))}
        {proposalTexts.length > 2 && (
          <li>...e mais {proposalTexts.length - 2} propostas.</li>
        )}
      </ul>

      {/* Trecho do Discurso */}
      <p style={styles.speechTextSnippet}>
        **Trecho do Discurso:** "{speechSnippet}"
      </p>
    </div>
  );
};

// --- Componente do Player do YouTube ---
const YouTubePlayer = ({ currentVideo }) => {
  const { youtubeId, startTime, debateTitle } = currentVideo;

  if (!youtubeId) {
    return (
      <div style={styles.playerContainer}>
        <h3 style={styles.videoTitle}>{debateTitle}</h3>
        <div style={styles.placeholder}>
          <p>Selecione uma proposta na lista ao lado para carregar o vídeo.</p>
        </div>
      </div>
    );
  }

  // URL para embed com o parâmetro 'start' para o tempo exato
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?start=${startTime}&autoplay=1`;

  return (
    <div style={styles.playerContainer}>
      <h3 style={styles.videoTitle}>Assista o debate: {debateTitle}</h3>
      <iframe
        style={styles.iframe}
        src={embedUrl}
        title={`YouTube video player: ${debateTitle}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

// --- Estilos Básicos (Adicionado estilo de erro) ---
const styles = {
  container: {
    display: "flex",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    gap: "20px",
  },
  listColumn: {
    flex: 1,
    minWidth: "350px",
    maxHeight: "80vh",
    overflowY: "auto",
    paddingRight: "10px",
  },
  videoColumn: {
    flex: 2,
  },
  proposalCard: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "10px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.05)",
  },
  candidateName: {
    fontWeight: "normal",
    fontSize: "1.1em",
    color: "#0056b3",
    marginBottom: "5px",
  },
  proposalList: {
    listStyleType: "disc",
    paddingLeft: "20px",
    margin: "5px 0 10px 0",
    fontSize: "0.9em",
  },
  speechTextSnippet: {
    marginTop: "10px",
    fontSize: "0.85em",
    color: "#333",
    borderTop: "1px dashed #eee",
    paddingTop: "5px",
    fontStyle: "italic",
  },
  playerContainer: {
    padding: "10px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
  },
  videoTitle: {
    marginBottom: "15px",
    fontSize: "1.2em",
    color: "#333",
  },
  iframe: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: "6px",
  },
  placeholder: {
    height: "400px",
    backgroundColor: "#ccc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    color: "#333",
    fontSize: "1.1em",
    textAlign: "center",
  },
  loading: {
    padding: "50px",
    textAlign: "center",
    fontSize: "1.5em",
    color: "#0056b3",
  },
  error: {
    padding: "50px",
    textAlign: "center",
    fontSize: "1.5em",
    color: "#d9534f",
    backgroundColor: "#fbe2e1",
    border: "1px solid #d9534f",
  },
};
