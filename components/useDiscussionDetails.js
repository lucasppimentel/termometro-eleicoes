import { useState, useEffect, useMemo } from "react";

export default function useDiscussionDetails(discussionId) {
  const [discussionData, setDiscussionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    if (!discussionId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/discussions/${discussionId}`)
      .then(res => res.ok ? res.json() : Promise.reject('Falha ao carregar dados da discussão'))
      .then(data => setDiscussionData(data))
      .catch(err => setError(err.message || err))
      .finally(() => setLoading(false));
  }, [discussionId]);

  // Helper for computed title
  const discussionTitle = useMemo(() => {
    if (!discussionData?.length) return `Discussão #${discussionId}`;
    const firstSpeech = discussionData[0];
    const theme = firstSpeech.contexto?.tema_abordado || "Tópico Não Identificado";
    const orator = firstSpeech.orador?.nome;
    return `Discussão #${discussionId}: ${theme}` + (orator ? ` (Iniciada por ${orator})` : "");
  }, [discussionData, discussionId]);

  return {
    discussionData,
    loading,
    error,
    currentVideo,
    setCurrentVideo,
    discussionTitle
  };
}
