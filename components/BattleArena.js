import React, { useState, useEffect, useMemo } from 'react';
import { Zap } from 'lucide-react';

// --- MOCK DATA GENERATOR (To simulate your Neo4j response) ---
const generateMockTimeline = () => {
    const candidates = ["Lula", "Bolsonaro", "Ciro", "Tebet", "Soraya", "Davila"];
    const events = [];
    let currentTime = 0;

    // Create 15 events
    for (let i = 0; i < 15; i++) {
        const speaker = candidates[Math.floor(Math.random() * candidates.length)];
        let target = candidates[Math.floor(Math.random() * candidates.length)];
        while (target === speaker) target = candidates[Math.floor(Math.random() * candidates.length)];

        const duration = 10 + Math.random() * 20; // 10 to 30 seconds
        const isQuestion = Math.random() > 0.6;
        
        events.push({
            speech_id: `speech_${i}`,
            start_time: currentTime,
            end_time: currentTime + duration,
            orador: { nome: speaker },
            // Simulating we know who they are talking to for visualization purposes
            target_nome: target, 
            contexto: { tema_abordado: ["Economia", "Saúde", "Corrupção", "Educação"][Math.floor(Math.random() * 4)] },
            interacao: {
                eh_pergunta: isQuestion,
                eh_resposta: !isQuestion,
                relevancia: !isQuestion ? { score: 2 + Math.random() * 3 } : null // Score 2.0 to 5.0
            }
        });
        currentTime += duration + 2; // Small gap between speeches
    }
    return events;
};

const MOCK_DATA = generateMockTimeline();

// --- HELPER: Geometry for the Circle ---
const getCoordinates = (index, total, radius, center) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start at top (-90deg)
    return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
    };
};

const BattleArena = ({ timeline: incomingTimeline }) => {
    // --- STATE ---
    const [timeline, setTimeline] = useState(incomingTimeline || MOCK_DATA);
    const [currentTime, setCurrentTime] = useState(0);
    const [stepIndex, setStepIndex] = useState(0);
    
    // Support updates from parent
    useEffect(() => {
        if (incomingTimeline && Array.isArray(incomingTimeline) && incomingTimeline.length > 0) {
            setTimeline(incomingTimeline);
            setCurrentTime(0);
        }
    }, [incomingTimeline]);

    // Dimensions
    const size = 600;
    const center = size / 2;
    const radius = 200;

    // Autoplay handled after processedTimeline is computed

    // --- DERIVED DATA ---
    // If events don't include `target_nome` but include `respondeu_a_speech_id`, resolve target speaker name
    const processedTimeline = useMemo(() => {
        const byId = new Map(timeline.map(ev => [ev.speech_id, ev]));
        return timeline.map(ev => {
            if (ev.target_nome) return ev;
            const repliedId = ev.interacao?.respondeu_a_speech_id;
            if (repliedId && byId.has(repliedId)) {
                const target = byId.get(repliedId);
                return { ...ev, target_nome: target?.orador?.nome };
            }
            return ev;
        });
    }, [timeline]);

    // Autoplay loop: advance one step every 0.5s, then wait 2s at end and restart
    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            while (!cancelled) {
                for (let i = 0; i < processedTimeline.length; i++) {
                    if (cancelled) return;
                    setStepIndex(i);
                    setCurrentTime(processedTimeline[i].start_time);
                    await new Promise(r => setTimeout(r, 500));
                }
                if (cancelled) return;
                await new Promise(r => setTimeout(r, 2000));
                // restart loop
            }
        };

        run();

        return () => { cancelled = true; };
    }, [processedTimeline]);

    // 1. Get Unique Candidates and assign positions
    const candidateNodes = useMemo(() => {
        const uniqueNames = [...new Set(processedTimeline.map(t => t.orador?.nome || ''))];
        return uniqueNames.map((name, index) => ({
            name,
            ...getCoordinates(index, uniqueNames.length, radius, center)
        }));
    }, [processedTimeline]);

    // 2. Find what is happening right now
    const activeEvents = processedTimeline.filter(
        t => currentTime >= t.start_time && currentTime <= t.end_time
    );

    const currentSpeakerName = activeEvents.length > 0 ? activeEvents[0].orador?.nome : null;
    const currentTheme = activeEvents.length > 0 ? activeEvents[0].contexto?.tema_abordado : "Intervalo";
    
    // Calculate progress percentage for scrubber
    const maxDuration = timeline.length ? timeline[timeline.length - 1].end_time : 100;
    const progress = (currentTime / maxDuration) * 100;

    // (autoplay handles stepping; manual controls removed)

    return (
        <div className="w-full max-w-4xl mx-auto bg-slate-900 text-white rounded-xl overflow-hidden shadow-2xl border border-slate-700">

            {/* ARENA (SVG) */}
            <div className="relative w-full h-[600px] bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Background Grid Effect */}
                <div className="absolute inset-0 opacity-10" 
                     style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                <svg width={size} height={size} className="z-10">
                    {/* Connections (The Shots Fired) */}
                    {activeEvents.map(event => {
                        const sourceNode = candidateNodes.find(n => n.name === event.orador?.nome);
                        if (!sourceNode) return null;

                        const isQuestion = !!event.interacao?.eh_pergunta;

                        // If this event is a question, draw an "attack" from the question speaker
                        // to every speech that replied to this question (using respondeu_a_speech_id).
                        if (isQuestion) {
                            const responders = processedTimeline.filter(ev => ev.interacao?.respondeu_a_speech_id === event.speech_id);
                            return responders.map(res => {
                                const targetNode = candidateNodes.find(n => n.name === res.orador?.nome);
                                if (!targetNode) return null;
                                const color = "#ef4444";
                                const strokeWidth = 2;
                                return (
                                    <g key={`q-${event.speech_id}-r-${res.speech_id}`}>
                                        <line
                                            x1={sourceNode.x} y1={sourceNode.y}
                                            x2={targetNode.x} y2={targetNode.y}
                                            stroke={color}
                                            strokeWidth={strokeWidth}
                                            strokeDasharray="5,5"
                                            className="animate-pulse opacity-80"
                                        />
                                        <circle r="6" fill={color}>
                                            <animateMotion
                                                dur="1s"
                                                repeatCount="indefinite"
                                                path={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`}
                                            />
                                        </circle>
                                    </g>
                                );
                            });
                        }

                        // Otherwise (answer or normal speech), draw single connection to target_nome (if present)
                        const targetNode = candidateNodes.find(n => n.name === event.target_nome);
                        if (!targetNode) return null;

                        const isAttack = false;
                        const score = event.interacao?.relevancia?.score || 1;
                        const strokeWidth = Math.max(2, score * 2); // Thicker line for better answers
                        const color = "#22c55e";

                        return (
                            <g key={event.speech_id}>
                                <line
                                    x1={sourceNode.x} y1={sourceNode.y}
                                    x2={targetNode.x} y2={targetNode.y}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={"0"}
                                    className="animate-pulse opacity-80"
                                />
                                <circle r="6" fill={color}>
                                    <animateMotion
                                        dur="1s"
                                        repeatCount="indefinite"
                                        path={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`}
                                    />
                                </circle>

                                {/* Label for Relevance */}
                                <g transform={`translate(${(sourceNode.x + targetNode.x)/2}, ${(sourceNode.y + targetNode.y)/2})`}>
                                    <rect x="-20" y="-12" width="40" height="24" rx="4" fill="#22c55e" />
                                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                                        {score.toFixed(1)}
                                    </text>
                                </g>
                            </g>
                        );
                    })}

                    {/* Nodes (Candidates) */}
                    {candidateNodes.map((node) => {
                        const isSpeaking = currentSpeakerName === node.name;
                        const isTarget = activeEvents.some(e => e.target_nome === node.name);
                        
                        return (
                            <g key={node.name} className="transition-all duration-300">
                                {/* Ping Effect when speaking */}
                                {isSpeaking && (
                                    <circle cx={node.x} cy={node.y} r="40" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.5">
                                        <animate attributeName="r" from="30" to="60" dur="1.5s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                )}

                                {/* Main Circle */}
                                <circle 
                                    cx={node.x} cy={node.y} r="30" 
                                    fill={isSpeaking ? "#4f46e5" : isTarget ? "#334155" : "#1e293b"}
                                    stroke={isSpeaking ? "#818cf8" : isTarget ? "#94a3b8" : "#475569"}
                                    strokeWidth={isSpeaking ? 4 : 2}
                                    className="transition-colors duration-300"
                                />
                                
                                {/* Candidate Name */}
                                <text 
                                    x={node.x} y={node.y} 
                                    dy="5" 
                                    textAnchor="middle" 
                                    className="fill-white text-xs font-bold pointer-events-none uppercase"
                                >
                                    {node.name}
                                </text>

                                {/* Speaking Icon */}
                                {isSpeaking && (
                                    <foreignObject x={node.x - 10} y={node.y - 50} width="20" height="20">
                                        <div className="flex justify-center">
                                            <Zap className="w-5 h-5 text-yellow-400 fill-current" />
                                        </div>
                                    </foreignObject>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

export default BattleArena;
