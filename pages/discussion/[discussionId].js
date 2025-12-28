import React from "react";
import { useRouter } from "next/router";
import useDiscussionDetails from "components/useDiscussionDetails";
import SpeechEvent from "components/SpeechEvent";
import VideoMomentModal from "components/VideoMomentModal";
import Layout from "components/Layout"; // Import Layout component
// Removed motion and AnimatePresence imports

// Removed bgStyle and meshNoise

const DiscussionDetailsPage = () => {
  const router = useRouter();
  const discussionId = router.query.discussionId;
  const {
    discussionData,
    loading,
    error,
    currentVideo,
    setCurrentVideo,
    discussionTitle
  } = useDiscussionDetails(discussionId);

  const debateId = discussionData?.[0]?.contexto?.debate_id; // Moved after discussionData is initialized

  // Handler for "moment in video"
  const handleSpeechClick = (speech) => {
    if (speech.contexto?.debate_id) {
      setCurrentVideo({
        youtubeId: speech.contexto.debate_id,
        startTime: speech.start_time || 0,
        debateTitle: speech.contexto.debate_title || "Debate"
      });
    }
  };
  const handleCloseModal = () => setCurrentVideo(null);

  // Define breadcrumbs here, after debateId is potentially available
  const breadcrumbs = debateId 
    ? [{ label: `Discussões`, href: `/debate/${debateId}/discussions` }, { label: "Detalhe da Discussão" }]
    : [{ label: "Detalhe da Discussão" }]; // Fallback if debateId is not yet available

  if (loading) {
    return (
      <Layout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center space-x-2 text-[#1351B4] font-semibold">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Carregando Discussão Detalhada...</span>
          </div>
        </div>
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout breadcrumbs={breadcrumbs}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="p-8 text-center text-red-600 bg-red-100 border border-red-300 rounded-sm max-w-lg">
            Erro ao carregar: {error}
          </div>
        </div>
      </Layout>
    );
  }
  // Validate at least 1 candidate
  const hasIdentifiedCandidate = discussionData?.some(
    speech => speech.orador?.nome !== "NÃO CANDIDATO"
  );
  if (!hasIdentifiedCandidate) {
    return (
      <Layout breadcrumbs={breadcrumbs}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="p-8 text-center text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-sm max-w-lg">
            <p className="font-bold text-lg">Discussão não disponível</p>
            <p className="text-sm mt-2">Esta discussão não contém candidatos identificados.</p>
          </div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout breadcrumbs={breadcrumbs}>
      {/* Header */}
      <header
        className="w-full bg-gray-100 border-b border-gray-300 py-6 text-center"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
            {discussionTitle}
          </h1>
          <p className="mt-2 text-lg text-gray-700 font-medium">
            Linha do Tempo de Interações Detalhadas
          </p>
        </div>
      </header>

      {/* Timeline Container */}
      <div
        className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 mt-8"
      >
        {/* Vertical Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 hidden md:block" />
        
        <div className="relative">
          {discussionData.map((speech, idx) => (
              <div
                key={speech.speech_id ?? idx}
                className="relative mb-8"
              >
                <SpeechEvent speech={speech} idx={idx} onSpeechClick={handleSpeechClick} />
              </div>
            ))}
        </div>

        {/* End Marker */}
        <div
          className="text-center mt-12 p-6 bg-white border border-gray-300 rounded-sm text-gray-700 shadow-sm"
        >
          <p className="font-bold text-lg">Fim da Discussão Sequencial.</p>
          <p className="text-sm mt-2 font-medium">Os dados apresentados seguem a ordem cronológica dos discursos.</p>
        </div>
      </div>

      {/* Video Modal */}
      <VideoMomentModal
        youtubeId={currentVideo?.youtubeId}
        startTime={currentVideo?.startTime}
        debateTitle={currentVideo?.debateTitle}
        onClose={handleCloseModal}
      />
    </Layout>
  );
};

export default DiscussionDetailsPage;