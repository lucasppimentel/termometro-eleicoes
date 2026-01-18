import React from "react";
import dynamic from "next/dynamic";
import { twMerge } from "tailwind-merge";
// Removed SpeechTimeline import

const BattleArena = dynamic(() => import("./BattleArena"), { ssr: false }); // Re-added BattleArena dynamic import

const DiscussionTimelinePanel = ({ timeline, loading, error, discussion }) => {
  return (
    <div
      className="rounded-sm border border-gray-300 bg-white shadow-sm w-full overflow-hidden relative"
    >
      <div className="relative z-10 p-6">
        <div className="mb-4">
          <p className="text-gray-800 text-base">{discussion.tema || "Sem tema descrito."}</p>
          <p className="text-gray-600 text-sm mt-1">Você está vendo uma representação visual da discussão, com candidatos e suas interações.</p>
        </div>
        {loading ? (
          <div
            className="py-12 text-center text-[#1351B4] font-semibold"
          >
            Carregando visualização...
          </div>
        ) : error ? (
          <div
            className="py-8 text-center text-red-600 font-semibold bg-red-50 border border-red-300 rounded-sm"
          >
            Erro: {error}
          </div>
        ) : timeline && timeline.length > 0 ? (
          <div>
            <BattleArena timeline={timeline} /> {/* Use BattleArena instead of SpeechTimeline */}
          </div>
        ) : (
          <div
            className="py-12 text-center text-gray-700"
          >
            Nenhuma linha do tempo/graph disponível.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscussionTimelinePanel;
