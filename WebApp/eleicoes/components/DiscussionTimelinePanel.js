import React from "react";
import dynamic from "next/dynamic";
// Removed motion import
import { twMerge } from "tailwind-merge";

const BattleArena = dynamic(() => import("./BattleArena"), { ssr: false });

const DiscussionTimelinePanel = ({ timeline, loading, error, discussion }) => {
  return (
    <div
      className="mt-4 rounded-sm border border-gray-300 bg-white shadow-sm w-full overflow-hidden relative"
    >
      <div className="relative z-10 p-6">
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 text-lg mb-1.5">Resumo do Tópico:</h3>
          <p className="text-gray-800 text-base">{discussion.tema || "Sem tema descrito."}</p>
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
            <BattleArena timeline={timeline} />
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
