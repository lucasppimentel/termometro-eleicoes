import { useState, useEffect } from "react";

export default function useDiscussionsList(debateId) {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timelines, setTimelines] = useState({});
  const [expandedDiscussionId, setExpandedDiscussionId] = useState(null);

  useEffect(() => {
    if (!debateId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/debate/${debateId}/discussions`)
      .then((res) => res.ok ? res.json() : Promise.reject('Falha ao carregar discussões do debate'))
      .then((data) => setDiscussions(data || []))
      .catch((err) => setError(err.message || err))
      .finally(() => setLoading(false));
  }, [debateId]);

  const fetchTimeline = (discussionId) => {
    if (!discussionId || timelines[discussionId]) return;
    fetch(`/api/v1/discussions/${discussionId}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setTimelines((prev) => ({ ...prev, [discussionId]: data })));
  };

  return {
    discussions,
    loading,
    error,
    timelines,
    expandedDiscussionId,
    setExpandedDiscussionId,
    fetchTimeline,
  };
}
