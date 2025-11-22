import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Users, MessageSquare, Target, ChevronRight } from 'lucide-react';

const BattleArena = dynamic(() => import('../../../../components/BattleArena'), { ssr: false });

// Página que lista todas as discussões (perguntas + respostas) de um debate
const DiscussionsList = () => {
    const router = useRouter();
    const { debateId } = router.query;
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedDiscussionId, setExpandedDiscussionId] = useState(null);
    const [discussionTimelines, setDiscussionTimelines] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            if (!debateId) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/debate/${debateId}/discussions`);
                if (!res.ok) throw new Error('Falha ao carregar discussões do debate');
                const data = await res.json();
                setDiscussions(data || []);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [debateId]);

    const getParticipants = (d) => {
        // If aggregation created a participants array, use it directly
        if (Array.isArray(d._participants)) return d._participants;

        const set = new Set();
        // API now returns `candidato` as the author of the question (previously candidato_perguntou)
        if (d.candidato) set.add(d.candidato);
        // keep backwards compatibility if older field exists
        if (d.candidato_perguntou) set.add(d.candidato_perguntou);
        // if the question/answer had an explicit target candidate
        if (d.alvo_nome) set.add(d.alvo_nome);
        if (d.candidato_alvo) set.add(d.candidato_alvo);
        // responses come with `candidato_resposta_nome`
        if (Array.isArray(d.respostas)) {
            d.respostas.forEach(r => { if (r.candidato_resposta_nome) set.add(r.candidato_resposta_nome); });
        }
        return Array.from(set);
    };

    const getInitials = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getSpeechesCount = (d) => {
        // If we've aggregated speeches into an array, use its length
        if (Array.isArray(d.speeches)) return d.speeches.length;
        const respostas = Array.isArray(d.respostas) ? d.respostas.length : 0;
        // Fallback: Uma pergunta + N respostas
        return 1 + respostas;
    };

    const handleCardClick = (discussionId) => {
        if (expandedDiscussionId === discussionId) {
            // Already expanded: navigate to discussion page
            router.push(`/discussion/${discussionId}`);
        } else {
            // Expand the card
            setExpandedDiscussionId(discussionId);
            // Fetch timeline data if not already loaded
            if (!discussionTimelines[discussionId]) {
                fetch(`/api/v1/discussions/${discussionId}`)
                    .then(r => r.json())
                    .then(data => {
                        setDiscussionTimelines(prev => ({ ...prev, [discussionId]: data }));
                    })
                    .catch(err => console.error('Error fetching discussion timeline:', err));
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-lg text-indigo-600">Carregando discussões do debate...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600 bg-red-100 rounded-lg shadow-inner max-w-lg mx-auto mt-10">Erro: {error}</div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            <header className="mb-8 text-center border-b pb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Discussões do Debate #{debateId}</h1>
                <p className="mt-2 text-lg text-gray-600">Lista de discussões (perguntas + respostas). Clique em uma para ver a linha do tempo completa.</p>
            </header>

            <div className="max-w-3xl mx-auto flex flex-col gap-4">
                {discussions.length === 0 ? (
                    <div className="w-full text-center p-10 bg-white rounded-lg shadow">
                        <p className="text-lg text-gray-700">Nenhuma discussão encontrada para este debate.</p>
                    </div>
                ) : (
                    // Agregar todos os Speeches que pertencem a uma mesma discussion_id
                    (() => {
                        const map = new Map();
                        discussions.forEach((item, idx) => {
                            const key = item.discussion_id ?? item.speech_id ?? item.pergunta_speech_id ?? null;
                            const mapKey = key ?? `no-id-${idx}`;

                            if (!map.has(mapKey)) {
                                map.set(mapKey, {
                                    discussion_id: item.discussion_id ?? null,
                                    // keep a representative speech id
                                    first_speech_id: item.speech_id ?? null,
                                    tema: item.tema ?? null,
                                    speeches: [],
                                    _participants: [],
                                });
                            }

                            const agg = map.get(mapKey);
                            // push the raw speech item to the speeches array
                            agg.speeches.push(item);

                            // collect participants into a set on the aggregated object
                            if (!agg._participantsSet) agg._participantsSet = new Set();
                            // possible candidate fields on each speech
                            if (item.candidato) agg._participantsSet.add(item.candidato);
                            if (item.candidato_perguntou) agg._participantsSet.add(item.candidato_perguntou);
                            if (item.alvo_nome) agg._participantsSet.add(item.alvo_nome);
                            if (item.candidato_alvo) agg._participantsSet.add(item.candidato_alvo);
                            // if speech includes respostas array, include their authors
                            if (Array.isArray(item.respostas)) {
                                item.respostas.forEach(r => { if (r.candidato_resposta_nome) agg._participantsSet.add(r.candidato_resposta_nome); });
                            }
                            // if a speech itself lists an orador/orador_nome
                            if (item.orador) agg._participantsSet.add(item.orador.nome ?? item.orador);
                            if (item.orador_nome) agg._participantsSet.add(item.orador_nome);

                            // update tema if missing
                            if (!agg.tema && item.tema) agg.tema = item.tema;
                        });

                        // finalize aggregated entries: convert sets to arrays and clean
                        const aggregated = Array.from(map.values()).map(a => {
                            a._participants = Array.from(a._participantsSet || []).filter(Boolean);
                            delete a._participantsSet;
                            return a;
                        });

                        // Filtrar discussões que têm ao menos um candidato identificado
                        // Exclui discussões onde todos os participantes são "NÃO CANDIDATO"
                        const filtered = aggregated.filter(d => {
                            const hasIdentifiedCandidate = d._participants.some(p => p !== "NÃO CANDIDATO");
                            return hasIdentifiedCandidate;
                        });

                        return filtered;
                    })().map((d) => {
                        const participants = getParticipants(d);
                        const participantsPreview = participants.slice(0, 4).join(', ') + (participants.length > 4 ? ` +${participants.length - 4}` : '');
                        const dId = d.discussion_id ?? d.speech_id;
                        const isExpanded = expandedDiscussionId === dId;
                        const timeline = discussionTimelines[dId];

                        return (
                            <div key={dId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 cursor-pointer" onClick={() => handleCardClick(dId)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-1 break-words whitespace-normal">{d.tema ?? 'Tema não informado'}</h2>

                                        <div className="flex items-center text-sm text-gray-600 mt-2">
                                            <Users className="w-4 h-4 mr-2 text-gray-500" />
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2">
                                                    {participants.map((p, idx) => (
                                                        <span
                                                            key={`${dId}-participant-${idx}`}
                                                            title={p}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium border-2 border-white"
                                                            aria-label={p}
                                                        >
                                                            {getInitials(p)}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-gray-500 text-xs">{participants.length} participante{participants.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ml-4 flex-shrink-0 flex items-center gap-3">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
                                            <span className="text-sm">{getSpeechesCount(d)}</span>
                                        </div>
                                        <ChevronRight className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        {timeline && timeline.length > 0 ? (
                                            <BattleArena timeline={timeline} />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">Carregando visualização...</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DiscussionsList;
