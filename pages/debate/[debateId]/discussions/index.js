import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Users, MessageSquare, Target, ChevronRight } from 'lucide-react';

// Página que lista todas as discussões (perguntas + respostas) de um debate
const DiscussionsList = () => {
    const router = useRouter();
    const { debateId } = router.query;
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        const set = new Set();
        if (d.candidato_perguntou) set.add(d.candidato_perguntou);
        if (d.candidato_alvo) set.add(d.candidato_alvo);
        if (Array.isArray(d.respostas)) {
            d.respostas.forEach(r => { if (r.candidato_resposta_nome) set.add(r.candidato_resposta_nome); });
        }
        return Array.from(set);
    };

    const getSpeechesCount = (d) => {
        const respostas = Array.isArray(d.respostas) ? d.respostas.length : 0;
        // Uma pergunta + N respostas
        return 1 + respostas;
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
                    discussions.map((d) => {
                        const participants = getParticipants(d);
                        const participantsPreview = participants.slice(0, 4).join(', ') + (participants.length > 4 ? ` +${participants.length - 4}` : '');
                        return (
                            <Link key={d.discussion_id ?? d.pergunta_speech_id} href={`/discussion/${d.discussion_id ?? d.pergunta_speech_id}`} className="block">
                                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-1 break-words whitespace-normal">{d.tema ?? 'Tema não informado'}</h2>

                                        <div className="flex items-center text-sm text-gray-600 mt-2">
                                            <Users className="w-4 h-4 mr-2 text-gray-500" />
                                            <span className="block truncate max-w-[22rem]" title={participants.join(', ')}>{participantsPreview}</span>
                                        </div>
                                    </div>

                                    <div className="ml-4 flex-shrink-0">
                                        <ChevronRight className="w-6 h-6 text-gray-400" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DiscussionsList;
