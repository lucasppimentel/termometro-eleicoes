// pages/index.js

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// Importação de ícones Lucide
import { Users, Clock, Zap, MapPin, Target, ChevronRight } from 'lucide-react';

// Mapeamento de cores para a pontuação de Relevância
const getRelevanceStyle = (score) => {
    if (score === 'N/A') return 'bg-gray-200 text-gray-700';
    const numScore = parseFloat(score);
    if (numScore >= 4.0) return 'bg-green-100 text-green-700 border-green-400';
    if (numScore >= 3.0) return 'bg-yellow-100 text-yellow-700 border-yellow-400';
    return 'bg-red-100 text-red-700 border-red-400';
};

// Componente para um cartão de debate individual
const DebateCard = ({ debate }) => {
    const relevanceStyle = getRelevanceStyle(debate.relevancia_media);

    return (
    <Link href={`/debate/${debate.id}/discussions`} className="block">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                
                {/* Cabeçalho */}
                <div className="flex justify-between items-start mb-4 border-b pb-3">
                    <h2 className="text-xl font-extrabold text-gray-900 leading-snug hover:text-indigo-600 transition-colors">
                        {debate.title}
                    </h2>
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-4 group-hover:text-indigo-600" />
                </div>

                {/* Metadados */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <p className="flex items-center"><Target className="w-4 h-4 mr-2 text-indigo-500" /> **Cargo:** {debate.cargo}</p>
                    <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-indigo-500" /> **Local:** {debate.location}</p>
                    <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-indigo-500" /> **Data:** {debate.date}</p>
                </div>

                {/* Participantes */}
                <div className="mb-4">
                    <p className="flex items-center text-gray-700 font-semibold mb-1"><Users className="w-4 h-4 mr-2 text-gray-500" /> Participantes:</p>
                    <div className="flex flex-wrap gap-2">
                        {debate.participantes.slice(0, 5).map((nome, i) => (
                            <span key={i} className="bg-indigo-50 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{nome}</span>
                        ))}
                        {debate.participantes.length > 5 && (
                             <span className="bg-gray-50 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">+{debate.participantes.length - 5} outros</span>
                        )}
                    </div>
                </div>

                {/* Temas */}
                <div className="mb-4">
                    <p className="flex items-center text-gray-700 font-semibold mb-1"><Target className="w-4 h-4 mr-2 text-gray-500" /> Temas Principais:</p>
                    <div className="flex flex-wrap gap-2">
                        {debate.temas.slice(0, 4).map((tema, i) => (
                            <span key={i} className="bg-teal-50 text-teal-800 text-xs font-medium px-2.5 py-0.5 rounded-lg">{tema}</span>
                        ))}
                    </div>
                </div>

                {/* Relevância Média */}
                <div className={`mt-4 p-3 rounded-lg border flex items-center justify-between ${relevanceStyle}`}>
                    <p className="font-bold flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Relevância Média das Respostas:
                    </p>
                    <span className="text-2xl font-extrabold">
                        {debate.relevancia_media} / 5.0
                    </span>
                </div>
            </div>
        </Link>
    );
};


// Componente Principal da Home Page
const HomePage = () => {
    const [debates, setDebates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/v1/debates/');
                if (!response.ok) {
                    throw new Error('Falha ao carregar a lista de debates');
                }
                const result = await response.json();
                setDebates(result);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-50">
                 <p className="text-xl text-indigo-600">Carregando lista de debates...</p>
             </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-600 bg-red-100 rounded-lg shadow-inner max-w-lg mx-auto mt-10">Erro: {error}</div>;
    }
    
    // Filtra para garantir que apenas debates com ID sejam exibidos
    const displayDebates = debates.filter(d => d.id);

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">

            {/* Faixa de aviso: Quer acesso aos dados? Use nossa API! */}
            <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 text-center mb-6">
                <p className="text-sm sm:text-base font-semibold">Quer acesso aos dados? <span className="font-extrabold">Use nossa API!</span></p>
            </div>

            <header className="mb-10 text-center border-b pb-6">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                    🏛️ Repositório de Debates
                </h1>
                <p className="mt-3 text-xl text-gray-600">Explore debates e veja a performance avaliada dos participantes.</p>
            </header>

            <div className="max-w-3xl mx-auto flex flex-col gap-6">
                {displayDebates.length > 0 ? (
                    displayDebates.map((debate) => (
                        <DebateCard key={debate.id} debate={debate} />
                    ))
                ) : (
                            <div className="w-full text-center p-10 bg-white rounded-lg shadow">
                         <p className="text-lg text-gray-700">Nenhum debate encontrado no banco de dados.</p>
                    </div>
                )}
            </div>

            <div className="text-center mt-12 p-4 bg-indigo-50 rounded-lg text-indigo-700 border-t-4 border-indigo-400 max-w-4xl mx-auto">
                <p className="text-sm">A relevância média reflete a nota média (1.0 a 5.0) dada às respostas do debate.</p>
            </div>
        </div>
    );
};

export default HomePage;