import React, { useState, useEffect, useCallback } from "react";

// Busca propostas de /api/v1/proposals
const fetchProposals = async () => {
  const endpointUrl = "/api/v1/proposals";

  const response = await fetch(endpointUrl);
  if (!response.ok) {
    throw new Error(`Erro ao carregar propostas: ${response.statusText}`);
  }
  return response.json();
};

// Componente principal
export default function DebateScreen() {
  const [proposalsByCandidate, setProposalsByCandidate] = useState({});
  const [candidateSummary, setCandidateSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVideo, setCurrentVideo] = useState({
    youtubeId: null,
    startTime: 0,
    debateTitle: "Selecione uma Proposta para Iniciar o Vídeo",
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Função para carregar e organizar os dados por candidato
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const proposalsData = await fetchProposals();

      // Agrupar propostas por candidato
      const groupedByCandidate = {};
      proposalsData.forEach((proposal) => {
        if (proposal.speech?.candidato?.nome_urna) {
          const candidateName = proposal.speech.candidato.nome_urna;
          
          if (!groupedByCandidate[candidateName]) {
            groupedByCandidate[candidateName] = {
              candidato: proposal.speech.candidato,
              proposals: [],
            };
          }
          
          groupedByCandidate[candidateName].proposals.push(proposal);
        }
      });

      setProposalsByCandidate(groupedByCandidate);

      // Criar resumo de candidatos (ordem por número de propostas)
      const summary = Object.entries(groupedByCandidate)
        .map(([name, data]) => ({
          name,
          candidato: data.candidato,
          totalProposals: data.proposals.length,
        }))
        .sort((a, b) => b.totalProposals - a.totalProposals);

      setCandidateSummary(summary);

      // Auto-selecionar o primeiro candidato
      if (summary.length > 0) {
        setSelectedCandidate(summary[0].name);
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
    const speech = proposal.speech;
    
    if (speech && speech.debate) {
      const debate = speech.debate;
      const youtubeId = debate.debate_id;
      // Use 'inicio' or 'start' depending on what the API returns
      const startTimeInSeconds = Math.floor(speech.inicio || speech.start || 0);

      setCurrentVideo({
        youtubeId: youtubeId,
        startTime: startTimeInSeconds,
        debateTitle: debate.title || "Debate",
      });
      setShowVideoModal(true);
    } else {
      console.error("Informação do debate não encontrada para a proposta");
    }
  };

  // Obter propostas do candidato selecionado
  const selectedProposals = selectedCandidate 
    ? proposalsByCandidate[selectedCandidate]?.proposals || []
    : [];

  if (loading) {
    return <div style={styles.loading}>Carregando dados dos debates...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      {/* Conteúdo principal - full width */}
      <div style={styles.mainContent}>
        {/* Lista de Candidatos */}
        <div style={styles.candidatesSection}>
          <h2>Candidatos</h2>
          <div style={styles.candidatesList}>
            {candidateSummary.map((candidate) => (
              <div
                key={candidate.name}
                style={{
                  ...styles.candidateCard,
                  ...(selectedCandidate === candidate.name
                    ? styles.candidateCardActive
                    : {}),
                }}
                onClick={() => setSelectedCandidate(candidate.name)}
              >
                <div style={styles.candidateCardHeader}>
                  <span style={styles.candidateName}>{candidate.name}</span>
                  <span style={styles.proposalCount}>
                    {candidate.totalProposals} propostas
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Propostas do Candidato Selecionado */}
        <div style={styles.proposalsSection}>
          <h2>
            {selectedCandidate
              ? `Propostas de ${selectedCandidate}`
              : "Selecione um candidato"}
          </h2>
          {selectedProposals.length > 0 ? (
            <div style={styles.proposalsList}>
              {selectedProposals.map((proposal, index) => (
                <ProposalItem
                  key={index}
                  proposal={proposal}
                  onClick={() => handleProposalClick(proposal)}
                />
              ))}
            </div>
          ) : (
            <p style={styles.emptyMessage}>
              {selectedCandidate
                ? "Nenhuma proposta encontrada."
                : "Selecione um candidato para ver suas propostas."}
            </p>
          )}
        </div>
      </div>

      {/* Modal do Vídeo */}
      {showVideoModal && (
        <VideoModal
          currentVideo={currentVideo}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </div>
  );
}

// --- Componente de Item da Proposta ---
const ProposalItem = ({ proposal, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  let proposalTexts;
  try {
    proposalTexts = JSON.parse(proposal.text);
  } catch (e) {
    proposalTexts = ["Erro ao ler propostas"];
  }

  return (
    <div
      style={{
        ...styles.proposalCard,
        ...(isHovered ? styles.proposalCardHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p style={styles.proposalCandidateName}>
        Candidato(a): <strong>{proposal.speech.candidato.nome_urna}</strong>
      </p>

      {/* Propostas em lista */}
      <ul style={styles.proposalList}>
        {proposalTexts.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>

      <p style={styles.clickHint}>Clique para assistir o discurso</p>
    </div>
  );
};

// --- Componente Modal do Vídeo ---
const VideoModal = ({ currentVideo, onClose }) => {
  const { youtubeId, startTime, debateTitle } = currentVideo;
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  if (!youtubeId) {
    return null;
  }

  // URL para embed com o parâmetro 'start' para o tempo exato
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?start=${startTime}&autoplay=1`;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{debateTitle}</h3>
          <button
            style={{
              ...styles.closeButton,
              ...(isCloseHovered ? styles.closeButtonHover : {}),
            }}
            onClick={onClose}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
          >
            ✕
          </button>
        </div>
        <iframe
          style={styles.modalIframe}
          src={embedUrl}
          title={`YouTube video player: ${debateTitle}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

// --- Estilos Básicos (Adicionado estilo de erro) ---
const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "100%",
    margin: "0 auto",
  },
  mainContent: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  candidatesSection: {
    flex: "0 0 auto",
  },
  candidatesList: {
    maxHeight: "300px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  candidateCard: {
    border: "2px solid #ddd",
    borderRadius: "8px",
    padding: "15px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
  },
  candidateCardActive: {
    borderColor: "#0056b3",
    backgroundColor: "#f0f7ff",
  },
  candidateCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  candidateName: {
    fontWeight: "bold",
    fontSize: "1.1em",
    color: "#0056b3",
  },
  proposalCount: {
    fontSize: "0.9em",
    color: "#666",
    backgroundColor: "#f0f0f0",
    padding: "5px 10px",
    borderRadius: "15px",
  },
  proposalsSection: {
    flex: "1 1 auto",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  proposalsList: {
    overflowY: "auto",
    flex: "1 1 auto",
  },
  proposalCard: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "15px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
    width: "100%",
  },
  proposalCardHover: {
    backgroundColor: "#f9f9f9",
    transform: "translateY(-2px)",
    boxShadow: "4px 4px 10px rgba(0,0,0,0.1)",
  },
  proposalCandidateName: {
    fontWeight: "normal",
    fontSize: "1.1em",
    color: "#0056b3",
    marginBottom: "10px",
  },
  proposalList: {
    listStyleType: "disc",
    paddingLeft: "20px",
    margin: "10px 0",
    fontSize: "1em",
  },
  clickHint: {
    marginTop: "15px",
    fontSize: "0.9em",
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    borderTop: "1px solid #eee",
    paddingTop: "10px",
  },
  emptyMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    maxWidth: "90vw",
    maxHeight: "90vh",
    width: "800px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    borderBottom: "1px solid #eee",
    backgroundColor: "#f9f9f9",
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.2em",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
    padding: "0",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "all 0.2s",
  },
  closeButtonHover: {
    backgroundColor: "#f0f0f0",
    color: "#333",
  },
  modalIframe: {
    width: "100%",
    aspectRatio: "16 / 9",
    border: "none",
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
