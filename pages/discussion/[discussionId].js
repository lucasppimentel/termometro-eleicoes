import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
// Importação de ícones Lucide para visualização
import { MessageSquare, ArrowRight, CornerDownRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import VideoModal from '../../components/VideoModal';

/**
 * Funções auxiliares para simular desempacotamento de números do Neo4j e formatação de tempo.
 */
const safeGetNumber = (value) => {
    if (value === undefined || value === null) return null;
    // Tenta desempacotar o objeto Low/High do Neo4j ou retorna o valor diretamente
    return typeof value === 'object' && value.low !== undefined ? value.low : value;
};

const formatTime = (seconds) => {
    if (seconds === null) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${Math.round(remainingSeconds.toString().padStart(2, '0'), 0)}`;
};


// Mapeamento de cores para cada tipo de interação
const interactionStyles = {
    pergunta: "bg-red-500/10 border-red-500 text-red-800",
    resposta: "bg-green-500/10 border-green-500 text-green-800",
    replicas: "bg-indigo-500/10 border-indigo-500 text-indigo-800",
    neutral: "bg-gray-100 border-gray-300 text-gray-700",
};

// Componente para um evento individual na linha do tempo
const SpeechEvent = ({ speech, onSpeechClick }) => {
    const { interacao, orador, texto, start_time, end_time, contexto } = speech;
    
    // Define o estilo baseado no tipo de interação
    let type = interacao.eh_pergunta ? 'pergunta' : 
               interacao.eh_resposta ? 'resposta' : 
               'replicas';
    
    const style = interactionStyles[type] || interactionStyles.neutral;
    const Icon = interacao.eh_pergunta ? ArrowRight : interacao.eh_resposta ? CornerDownRight : MessageSquare;

    const duration = Math.round(safeGetNumber(end_time) - safeGetNumber(start_time), 1);

    // Cor da pontuação de Relevância
    let scoreColor = 'text-gray-500';
    if (interacao.relevancia) {
        // Assume que a relevância vem como número (o mock data já faz isso)
        const scoreValue = safeGetNumber(interacao.relevancia.score);

        if (scoreValue >= 4) scoreColor = 'text-green-600';
        else if (scoreValue >= 3) scoreColor = 'text-yellow-600';
        else scoreColor = 'text-red-600';
    }

    return (
        <div 
            className={`flex flex-col md:flex-row items-start space-y-3 md:space-y-0 md:space-x-4 p-4 rounded-lg shadow-md border ${style} transition-all duration-300 hover:shadow-xl cursor-pointer`}
            onClick={() => onSpeechClick && onSpeechClick(speech)}
        >
            {/* Ícone e Tempo (Coluna 1) */}
            <div className="flex-shrink-0 w-full md:w-20 text-center md:text-left">
                <Icon className={`w-6 h-6 mx-auto md:mx-0 ${style.includes('red') ? 'text-red-600' : style.includes('green') ? 'text-green-600' : 'text-indigo-600'}`} />
                <p className="text-xs mt-1 text-gray-500 flex items-center justify-center md:justify-start">
                    <Clock className="w-3 h-3 mr-1" /> 
                    {formatTime(safeGetNumber(start_time))} ({duration}s)
                </p>
            </div>

            {/* Conteúdo da Fala (Coluna 2) */}
            <div className="flex-grow">
                {/* Título e Orador */}
                <h3 className={`text-lg font-semibold ${style.includes('red') ? 'text-red-800' : style.includes('green') ? 'text-green-800' : 'text-indigo-800'}`}>
                    {orador.nome}
                    <span className="ml-2 font-normal text-sm text-gray-500">
                        ({interacao.eh_pergunta ? 'PERGUNTA' : interacao.eh_resposta ? 'RESPOSTA' : 'RÉPLICA'})
                    </span>
                </h3>
                
                {/* Alvo e Tema */}
                <div className="text-sm text-gray-600 my-1">
                    {interacao.eh_pergunta && interacao.alvo_nome && (
                        <span className="font-medium mr-4">ALVO: {interacao.alvo_nome}</span>
                    )}
                    {contexto.tema_abordado && (
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">TEMA: {contexto.tema_abordado}</span>
                    )}
                </div>

                {/* Texto da Fala */}
                <p className="mt-2 text-base italic leading-relaxed text-gray-700">
                    "{speech.text}"
                </p>

                {/* Pontuação de Relevância (Apenas para Respostas) */}
                {interacao.eh_resposta && interacao.relevancia && (
                    <div className="mt-4 p-3 bg-white rounded-md border border-dashed border-gray-300">
                        <p className="text-sm font-semibold flex items-center">
                            {safeGetNumber(interacao.relevancia.score) >= 3 ? 
                                <CheckCircle className="w-4 h-4 mr-1 text-green-500" /> : 
                                <XCircle className="w-4 h-4 mr-1 text-red-500" />
                            }
                            RELEVÂNCIA: 
                            <span className={`ml-1 font-bold text-lg ${scoreColor}`}>
                                {safeGetNumber(interacao.relevancia.score).toFixed(1)} / 5.0
                            </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            **Justificativa:** {interacao.relevancia.justificativa}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente Principal
const DiscussionViewer = () => {
    const router = useRouter();
    const { discussionId } = router.query;
    const [discussionData, setDiscussionData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentVideo, setCurrentVideo] = useState(null);

    // Handler para abrir o modal com o vídeo
    const handleSpeechClick = (speech) => {
        if (speech.contexto.debate_id) {
            setCurrentVideo({
                youtubeId: speech.contexto.debate_id,
                startTime: speech.start_time || 0,
                debateTitle: speech.contexto.debate_title || 'Debate',
            });
        }
    };

    // Handler para fechar o modal
    const handleCloseModal = () => {
        setCurrentVideo(null);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!discussionId) return;
                setLoading(true);
                const response = await fetch(`/api/v1/discussions/${discussionId}`);
                if (!response.ok) {
                    throw new Error('Falha ao carregar dados da discussão');
                }
                const result = await response.json();
                setDiscussionData(result);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [discussionId]);

    // Efeito para carregar o Tailwind e a Fonte Inter apenas uma vez no HEAD do documento.
    // Isso é a correção para o problema de estilo.
    useEffect(() => {
        // 1. Carregar Tailwind CSS CDN
        // const tailwindScriptId = 'tailwind-cdn-script';
        // if (!document.getElementById(tailwindScriptId)) {
        //     const script = document.createElement('script');
        //     script.src = "https://cdn.tailwindcss.com";
        //     script.id = tailwindScriptId;
        //     document.head.appendChild(script);
        // }

        // 2. Carregar Fonte Inter (CSS Link)
        const fontLinkTagId = 'inter-font-link';
        if (!document.getElementById(fontLinkTagId)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap";
            link.id = fontLinkTagId;
            document.head.appendChild(link);

            // Opcional: Aplicar a fonte Inter ao body via style tag
            const styleTagId = 'inter-font-style';
            if (!document.getElementById(styleTagId)) {
                const style = document.createElement('style');
                style.id = styleTagId;
                style.textContent = 'body { font-family: "Inter", sans-serif; }';
                document.head.appendChild(style);
            }
        }
    }, []);

    useEffect(() => {
        const loadDiscussion = async () => {
            try {
                if (!discussionId) return;
                const response = await fetch(`/api/v1/discussions/${discussionId}`);
                if (!response.ok) {
                    throw new Error('Falha ao carregar dados da discussão');
                }
                const result = await response.json();
                setDiscussionData(result);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        setLoading(true);
        loadDiscussion();
    }, [discussionId]);

    // Calcula o título baseado no tema e no primeiro orador
    const discussionTitle = useMemo(() => {
        if (discussionData.length === 0) return `Discussão #${discussionId}`;
        const firstSpeech = discussionData[0];
        const theme = firstSpeech.contexto.tema_abordado || "Tópico Não Identificado";
        const orator = firstSpeech.orador.nome;
        return `Discussão #${discussionId}: ${theme} (Iniciada por ${orator})`;
    }, [discussionData, discussionId]);


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex items-center space-x-2 text-indigo-600">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Carregando Discussão Detalhada...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-600 bg-red-100 rounded-lg shadow-inner">Erro ao carregar: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            
            <header className="mb-8 text-center border-b pb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                    {discussionTitle}
                </h1>
                <p className="mt-2 text-lg text-indigo-600 font-medium">Linha do Tempo de Interações Detalhadas</p>
            </header>

            <div className="max-w-4xl mx-auto">
                {discussionData.map((speech, index) => (
                    <div key={speech.speech_id} className="relative mb-8">
                        {/* Linha do tempo (conexão visual) - Visível apenas em desktop */}
                        {index < discussionData.length - 1 && (
                            <div className="absolute left-10 md:left-24 top-0 h-full w-0.5 bg-gray-300 hidden md:block z-0 transform translate-x-1/2"></div>
                        )}
                        
                        {/* Círculo de Ponto (Marcador visual) - Visível apenas em desktop */}
                        <div className="absolute left-10 md:left-24 top-4 h-5 w-5 rounded-full bg-white border-4 border-indigo-500 z-10 transform translate-x-1/2 hidden md:block"></div>

                        {/* Evento */}
                        <div className="pl-0 md:pl-32 relative z-10">
                            <SpeechEvent speech={{ ...speech, texto: speech.text }} onSpeechClick={handleSpeechClick} />
                        </div>
                    </div>
                ))}

                <div className="text-center mt-12 p-4 bg-indigo-50 rounded-lg text-indigo-700 border-t-4 border-indigo-400">
                    <p className="font-semibold">Fim da Discussão Sequencial.</p>
                    <p className="text-sm mt-1">Os dados apresentados seguem a ordem cronológica dos discursos.</p>
                </div>
            </div>

            {/* VideoModal */}
            {currentVideo && (
                <VideoModal currentVideo={currentVideo} onClose={handleCloseModal} />
            )}
        </div>
    );
};

export default DiscussionViewer;