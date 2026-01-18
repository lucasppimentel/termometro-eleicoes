import { useState, useEffect, useMemo } from "react";

export default function useDebates() {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [participant, setParticipant] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/v1/debates/");
        if (!response.ok) throw new Error("Falha ao carregar a lista de debates");
        const result = await response.json();
        setDebates(result);
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered Debates
  const filteredDebates = useMemo(() => {
    return debates.filter((debate) => {
      if (!debate || !debate.id) return false;
      let match = true;
      if (search) {
        const s = search.toLowerCase();
        match = match && (
          (debate.title && debate.title.toLowerCase().includes(s)) ||
          (debate.temas && debate.temas.join(' ').toLowerCase().includes(s))
        );
      }
      if (date) {
        match = match && debate.date && debate.date.startsWith(date);
      }
      if (participant) {
        match = match && debate.participantes && debate.participantes.includes(participant);
      }
      return match;
    });
  }, [debates, search, date, participant]);

  // Collect all unique participants from all debates for the filter dropdown
  const participantsOptions = useMemo(() => {
    const set = new Set();
    debates.forEach(d => d.participantes && d.participantes.forEach(p => set.add(p)));
    return Array.from(set).sort();
  }, [debates]);

  return {
    debates: filteredDebates,
    loading,
    error,
    search,
    setSearch,
    date,
    setDate,
    participant,
    setParticipant,
    participantsOptions,
  };
}
