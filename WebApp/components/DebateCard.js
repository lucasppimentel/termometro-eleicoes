import React from "react";
import { Users, Target, MapPin, Clock, ChevronRight } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

const spectrumGradients = [
  "from-pink-400 via-orange-300 to-yellow-400",
  "from-blue-500 via-green-400 to-teal-300",
  "from-purple-400 via-indigo-400 to-blue-400",
  "from-rose-400 via-pink-500 to-orange-200",
];

const getSpectrumGradient = (debate, total = 4) => {
  const key = String(debate.cargo || debate.id || "na");
  let acc = 0;
  for (let i = 0; i < key.length; i++) acc += key.charCodeAt(i);
  return spectrumGradients[acc % total];
};

function ActivityPulse({ level = 0 }) {
  const colors = [
    "bg-green-400/80",
    "bg-yellow-400/80",
    "bg-orange-400/80",
    "bg-red-500/80 animate-pulse",
  ];
  return (
    <span
      className={twMerge(
        "inline-block rounded-full shadow-md mx-1",
        colors[Math.min(level, colors.length - 1)],
        "w-4 h-4"
      )}
    />
  );
}

const DebateCard = ({ debate }) => {
  const activityScore = debate.atividade || debate.total_mensagens || 0;

  return (
    <Link
      href={`/debate/${debate.id}/discussions`}
      className={twMerge(
        "group relative overflow-hidden rounded-sm border border-gray-300 w-full min-h-[230px] flex flex-col cursor-pointer transition-all duration-150 ease-in-out",
        "hover:border-[#1351B4] hover:shadow-md"
      )}
    >
      {/* Status Bar at the top of the card */}
      <div
        className={twMerge(
          "absolute top-0 left-0 right-0 h-2",
          debate.status === "Active" ? "bg-[#009C3B]" : "bg-gray-400"
        )}
      />

      {/* Main Card Content */}
      <div className="relative z-20 flex flex-col gap-3 w-full p-6 pt-8 bg-white flex-grow">
        {/* Title and Arrow */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">
            {debate.title}
          </h2>
          <div className="flex items-center gap-1 px-3 py-1 rounded-sm font-bold text-sm bg-gray-100 text-gray-700 border border-gray-300 transition-all duration-150 ease-in-out group-hover:bg-gray-200 group-hover:shadow-sm">
            <span>Ver Detalhes</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
        {/* Metadata row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-700 font-medium">
          <span className="flex items-center gap-1">
            <Target className="w-4 h-4 text-gray-500" /> {debate.cargo}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-gray-500" /> {debate.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-500" /> {debate.date}
          </span>
        </div>
        {/* PARTICIPANTS */}
        <div className="mt-2 mb-1">
          <span className="flex items-center text-gray-800 font-bold gap-1 mb-1">
            <Users className="w-4 h-4 text-gray-500" /> Participantes:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {debate.participantes &&
              debate.participantes.slice(0, 5).map((nome, i) => (
                <span
                  key={i}
                  className={twMerge(
                    "text-xs px-2 py-0.5 rounded-sm font-semibold",
                    "bg-gray-100 text-gray-700 border border-gray-300",
                    "hover:bg-gray-200 hover:text-gray-800",
                    "transition duration-200"
                  )}
                >
                  {nome}
                </span>
              ))}
            {debate.participantes?.length > 5 && (
              <span className="text-xs px-2 py-0.5 rounded-sm bg-gray-100 border border-gray-300 text-gray-500">
                +{debate.participantes.length - 5} outros
              </span>
            )}
          </div>
        </div>
        {/* RELEVANCIA MINI BAR */}
        <div className="flex items-center gap-2 mt-3">
          <span className="font-bold flex items-center text-gray-800">
            Relevância Média:
          </span>
          <div className="relative w-28 h-3 bg-gray-200 rounded-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-3 bg-[#009C3B] rounded-sm"
              style={{ width: `${(Number(debate.relevancia_media || 0) / 5) * 100}%` }}
            />
          </div>
          <span className="ml-2 text-sm font-medium text-gray-900">
            {debate.relevancia_media} / 5.0
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DebateCard;
