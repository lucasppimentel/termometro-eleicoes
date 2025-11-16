import React, { useState } from 'react';

/**
 * Componente de Modal de Vídeo
 * @param {Object} props
 * @param {Object} props.currentVideo Objeto contendo { youtubeId, startTime, debateTitle }.
 * @param {function} props.onClose Função para fechar o modal.
 */
const VideoModal = ({ currentVideo, onClose }) => {
  const { youtubeId, startTime, debateTitle } = currentVideo;
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  if (!youtubeId) {
    return null;
  }

  // URL para embed com o parâmetro 'start' para o tempo exato e 'autoplay'
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(startTime)}&autoplay=1`;

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

// --- Estilos Requeridos ---
// Estes estilos são necessários para que o componente VideoModal funcione corretamente.
const styles = {
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
};

export default VideoModal;
