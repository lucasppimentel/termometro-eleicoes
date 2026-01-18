import React from "react";
import { ArrowRight, CornerDownRight, MessageSquare, Zap, Play, Clock } from "lucide-react";
// Removed motion import
import { twMerge } from "tailwind-merge";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const avatarColors = [
  "bg-indigo-100 text-indigo-700 border-indigo-300",
  "bg-emerald-100 text-emerald-700 border-emerald-300",
  "bg-teal-100 text-teal-700 border-teal-300",
  "bg-pink-100 text-pink-700 border-pink-300",
  "bg-violet-100 text-violet-700 border-violet-300",
];
const getColor = (idx) => avatarColors[idx % avatarColors.length];

const speechType = (speech) =>
  speech.interacao?.eh_pergunta ? "pergunta" :
  speech.interacao?.eh_resposta ? "resposta" :
  "replica";

const typeLabel = {
  pergunta: "PERGUNTA",
  resposta: "RESPOSTA",
  replica: "RÉPLICA"
};

const typeIcon = {
  pergunta: ArrowRight,
  resposta: CornerDownRight,
  replica: MessageSquare
};

const badgeStyle = {
  pergunta: "bg-red-50 text-red-800 border-red-300",
  resposta: "bg-green-50 text-green-800 border-green-300",
  replica: "bg-blue-50 text-blue-800 border-blue-300"
};

const formatTime = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function SpeechEvent({ speech, idx, onSpeechClick }) {
  const t = speechType(speech);
  const Icon = typeIcon[t];
  const style = badgeStyle[t];
  const proposals = speech.proposals ?? speech.propostas ?? [];
  let proposalsList = proposals;
  if (typeof proposals === "string") {
    try { proposalsList = JSON.parse(proposals); } catch { proposalsList = proposals.split(/,\s*/); }
  }
  const hasVideo = !!speech.contexto?.debate_id;
  const timeStr = speech.start_time ? formatTime(speech.start_time) : null;

  return (
    <div
      className={twMerge(
        "group relative flex flex-col md:flex-row items-start gap-6 p-6 rounded-sm border border-gray-200 bg-white cursor-pointer transition-colors duration-150 ease-in-out",
        idx % 2 === 0 ? "bg-gray-50" : "bg-white", // Zebra striping
        "hover:border-[#1351B4] hover:shadow-sm"
      )}
      onClick={() => onSpeechClick && onSpeechClick(speech)}
    >
      {/* Vertical Timeline Indicator (Left Border) */}
      <div className={twMerge(
        "absolute left-0 top-0 bottom-0 w-1 rounded-sm",
        t === "pergunta" ? "bg-red-600" :
        t === "resposta" ? "bg-green-600" :
        "bg-[#1351B4]"
      )} />

      {/* Avatar + Meta */}
      <div className="flex flex-col items-center min-w-[80px] md:min-w-[100px] relative z-10">
        <div
          className={twMerge(
            "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-sm font-black text-lg md:text-xl border-2 shadow-sm",
            getColor(idx)
          )}
        >
          {getInitials(speech.orador?.nome)}
        </div>
        <span className={twMerge(
          "text-xs font-bold mt-2 px-2 py-0.5 rounded-sm border",
          style
        )}>
          {typeLabel[t]}
        </span>
        <Icon className="w-5 h-5 mt-2 text-gray-500" />
      </div>

      {/* Content - Journalistic Quote Style */}
      <div className="flex-grow relative z-10">
        {/* Speaker Name + Meta */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="font-bold text-xl text-gray-900">{speech.orador?.nome}</h3>
          {speech.interacao?.alvo_nome && (
            <span className="px-3 py-1 rounded-sm bg-gray-100 text-xs text-gray-700 font-semibold border border-gray-300">
              alvo: {speech.interacao.alvo_nome}
            </span>
          )}
        </div>

        {/* Main Quote/Content */}
        <div className="relative pl-6 border-l-4 border-gray-300 mb-4">
          {speech.interacao?.eh_pergunta && (
            <p className="text-lg md:text-xl text-gray-800 font-medium leading-relaxed">
              "{speech.pergunta}"
            </p>
          )}
          {speech.interacao?.eh_resposta && (
            <>
              <p className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Resumo:</p>
              <p className="text-base md:text-lg text-gray-800 leading-relaxed">{speech.resumo}</p>
            </>
          )}
          {!speech.interacao?.eh_pergunta && !speech.interacao?.eh_resposta && (
            <>
              <p className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Réplicas:</p>
              <p className="text-base md:text-lg text-gray-800 leading-relaxed">{speech.resumo}</p>
            </>
          )}
        </div>

        {/* Proposals/Badges - Pill Style */}
        {proposalsList && Array.isArray(proposalsList) && proposalsList.length > 0 && (
          <div className="mt-3 mb-3">
            <span className="font-bold text-sm text-gray-800 mb-2 block">Propostas:</span>
            <div className="flex flex-wrap gap-2">
              {proposalsList.map((p, i) => (
                <span
                  key={i}
                  className="bg-blue-50 text-blue-700 border border-blue-300 px-3 py-1 rounded-sm text-xs font-bold"
                >
                  {typeof p === 'string' ? p : (p.title || p.nome || p.name || p.description || JSON.stringify(p))}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Score for response */}
        {speech.interacao?.eh_resposta && speech.interacao.relevancia && (
          <div className="flex items-center gap-2 mt-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-sm text-gray-800">Relevância:</span>
            <span className={twMerge(
              "font-bold text-lg",
              speech.interacao.relevancia.score >= 3 ? 'text-[#009C3B]' : 'text-red-600' // Forest Green for success
            )}>
              {Number(speech.interacao.relevancia.score).toFixed(1)} / 5.0
            </span>
          </div>
        )}

        {/* Video Timestamp Button */}
        {hasVideo && timeStr && (
          <button
            className={twMerge(
              "mt-4 flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-sm",
              "bg-[#1351B4] text-white",
              "border border-gray-300 transition-all duration-150 ease-in-out",
              "hover:bg-[#1351B4]/90 hover:shadow-sm",
              "group/btn"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSpeechClick && onSpeechClick(speech);
            }}
          >
            <Play className="w-4 h-4 group-hover/btn:scale-105 transition-transform" />
            <Clock className="w-4 h-4" />
            <span>Assistir em {timeStr}</span>
          </button>
        )}
      </div>
    </div>
  );
}
