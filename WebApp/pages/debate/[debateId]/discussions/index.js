import React from "react";
import { useRouter } from "next/router";
import DiscussionCard from "components/DiscussionCard";
import DiscussionTimelinePanel from "components/DiscussionTimelinePanel";
import useDiscussionsList from "components/useDiscussionsList";
import Layout from "components/Layout"; // Import Layout component
// Removed motion and AnimatePresence imports

// Removed bgStyle and meshNoise

const DiscussionsListPage = () => {
  const router = useRouter();
  const { debateId } = router.query;
  const {
    discussions,
    loading,
    error,
    timelines,
    expandedDiscussionId,
    setExpandedDiscussionId,
    fetchTimeline
  } = useDiscussionsList(debateId);

  const handleExpand = (discussionId) => {
    if (expandedDiscussionId === discussionId) {
      router.push(`/discussion/${discussionId}`);
    } else {
      setExpandedDiscussionId(discussionId);
      fetchTimeline(discussionId);
    }
  };
  
  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: `Discussões`, href: `/debate/${debateId}/discussions` }]}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-xl text-[#1351B4] font-semibold">Carregando discussões do debate...</p>
      </div>
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout breadcrumbs={[{ label: `Discussões`, href: `/debate/${debateId}/discussions` }]}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="p-8 text-center text-red-600 bg-red-100 border border-red-300 rounded-sm max-w-lg mx-auto">
          Erro: {error}
          </div>
      </div>
      </Layout>
    );
  }

  // Aggregate discussions as before:
  const aggregated = (() => {
    const map = new Map();
    discussions.forEach((item, idx) => {
      const key = item.discussion_id ?? item.speech_id ?? item.pergunta_speech_id ?? null;
      const mapKey = key ?? `no-id-${idx}`;
      if (!map.has(mapKey)) {
        map.set(mapKey, {
          discussion_id: item.discussion_id ?? null,
          first_speech_id: item.speech_id ?? null,
          tema: item.tema ?? null,
          speeches: [],
          _participants: [],
        });
      }
      const agg = map.get(mapKey);
      agg.speeches.push(item);
      if (!agg._participantsSet) agg._participantsSet = new Set();
      [item.candidato, item.candidato_perguntou, item.alvo_nome, item.candidato_alvo, item.orador?.nome, item.orador_nome].forEach(v => v && agg._participantsSet.add(v));
      if (Array.isArray(item.respostas)) {
        item.respostas.forEach(r => r.candidato_resposta_nome && agg._participantsSet.add(r.candidato_resposta_nome));
      }
      if (!agg.tema && item.tema) agg.tema = item.tema;
    });
    const aggregated = Array.from(map.values()).map(a => {
      a._participants = Array.from(a._participantsSet || []).filter(Boolean);
      delete a._participantsSet;
      return a;
    });
    return aggregated.filter(d => d._participants.some(p => p !== "NÃO CANDIDATO"));
  })();

  return (
    <Layout breadcrumbs={[{ label: `Discussões`, href: `/debate/${debateId}/discussions` }]}>
      {/* Header */}
      <header
        className="w-full bg-gray-100 border-b border-gray-300 py-6 text-center"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
            Discussões do Debate #{debateId}
          </h1>
          <p className="mt-2 text-lg text-gray-700 font-medium">
            Lista de discussões (perguntas + respostas). Clique em uma para visualizar o gráfico de interações.
          </p>
        </div>
      </header>

      {/* Discussions List */}
      <div
        className="max-w-7xl mx-auto relative z-10 flex flex-col gap-6 px-4 sm:px-6 lg:px-8 mt-8"
      >
        {aggregated.length === 0 ? (
          <div
            className="w-full text-center p-12 bg-white border border-gray-300 rounded-sm"
          >
            <p className="text-lg text-gray-700 font-semibold">Nenhuma discussão encontrada para este debate.</p>
          </div>
        ) : (
          <>
            {aggregated.map((d, i) => {
              const discussionKey = d.discussion_id ?? d.first_speech_id;
              return (
                <div
                  key={discussionKey ?? i}
                >
                  <DiscussionCard
                    discussion={d}
                    isExpanded={expandedDiscussionId === discussionKey}
                    onExpand={() => handleExpand(discussionKey)}
                    onToggleExpand={() => {
                      if (expandedDiscussionId === discussionKey) {
                        setExpandedDiscussionId(null); // Collapse if already expanded
                      } else {
                        setExpandedDiscussionId(discussionKey); // Expand
                        fetchTimeline(discussionKey); // Fetch data when expanding
                      }
                    }}
                    idx={i}
                  />
                    {expandedDiscussionId === discussionKey && (
                      <DiscussionTimelinePanel
                        timeline={timelines[discussionKey]}
                        loading={!timelines[discussionKey]}
                        error={null}
                        discussion={d}
                      />
                    )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </Layout>
  );
};
export default DiscussionsListPage;
