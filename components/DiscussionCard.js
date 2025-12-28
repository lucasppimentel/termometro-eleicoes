import React from "react";
import { Users, ChevronRight, MessageSquare } from "lucide-react";
// Removed motion import
import { twMerge } from "tailwind-merge";
import Link from 'next/link'; // Import Link

// Removed spectrumGradients

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const colors = [
  "bg-red-100",
  "bg-green-100",
  "bg-blue-100",
  "bg-yellow-100",
  "bg-teal-100",
  "bg-violet-100",
  "bg-pink-100",
];
const getColor = (i) => colors[i % colors.length];

// Removed getSpectrumGradient

const DiscussionCard = ({ discussion, isExpanded, onExpand, onToggleExpand, idx }) => {
  const participants = discussion._participants || [];
  // Removed cardBorder

  return (
    <div
      className={twMerge(
        "group relative overflow-hidden rounded-sm border border-gray-300 w-full min-h-[120px] flex flex-col transition-all duration-150 ease-in-out bg-white",
        isExpanded ? "border-[#1351B4] shadow-md" : "hover:border-[#1351B4] hover:shadow-md"
      )}
    >
      {/* Main Card Content (Not directly clickable for navigation anymore) */}
      <div
        className="relative z-20 flex flex-grow items-center justify-between w-full p-6"
      >
        <div className="flex items-center gap-6 min-w-0 flex-1">
          <div className="flex flex-col min-w-0 gap-2 flex-1">
            <h2 className="text-xl font-bold text-gray-900 truncate tracking-tight">
              {discussion.tema || "Tema não informado"}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-700 font-medium">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-500" />{participants.length} participante{participants.length !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-gray-500" />{discussion.speeches?.length ?? 1} fala{(discussion.speeches?.length ?? 1) !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex mt-2 gap-2 flex-wrap">
              {participants.slice(0, 5).map((name, i) => (
                <span
                  key={name}
                  title={name}
                  className={twMerge("inline-flex items-center justify-center w-8 h-8 rounded-sm text-xs font-bold border border-gray-300", getColor(i), "text-gray-800")}
                >
                  {getInitials(name)}
                </span>
              ))}
              {participants.length > 5 && (<span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-sm border border-gray-300">+{participants.length - 5}</span>)}
            </div>
          </div>
        </div>
        {/* Removed inline Details Button */}
        {/* Removed inline Arrow Button from here */}
      </div>
      {/* Bottom section with Details Button and Arrow Button */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <Link
          href={`/discussion/${discussion.discussion_id}`}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-sm font-bold text-sm bg-[#1351B4] text-white border border-gray-300 transition-all duration-150 ease-in-out hover:bg-[#1351B4]/90 hover:shadow-sm"
        >
          Clique para ver os detalhes
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="transition-transform duration-150 ease-in-out p-2 px-3 rounded-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1351B4] flex items-center gap-1 text-sm text-gray-700 font-medium"
          aria-label={isExpanded ? "Contrair discussão" : "Expandir discussão"}
        >
          <span>Visualizar Discussão</span>
          <ChevronRight className={twMerge(
            "w-6 h-6 text-gray-500 group-hover:text-[#1351B4] transition-colors",
            isExpanded && "rotate-90"
          )} />
        </button>
      </div>
    </div>
  );
};

export default DiscussionCard;

