import React from "react";

const DebateFilterBar = ({
  search,
  onSearchChange,
  date,
  onDateChange,
  participant,
  onParticipantChange,
  participantsOptions,
}) => {
  return (
    <section className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between w-full p-4 bg-gray-100 border border-gray-300 rounded-sm">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Buscar título ou tema..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full sm:w-1/2 px-3 py-2 rounded-sm border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-1 focus:ring-[#1351B4] focus:border-[#1351B4] outline-none"
      />
      {/* Date Filter */}
      <input
        type="date"
        value={date}
        onChange={e => onDateChange(e.target.value)}
        className="w-full sm:w-auto px-3 py-2 rounded-sm border border-gray-300 bg-white text-gray-900 focus:ring-1 focus:ring-[#1351B4] focus:border-[#1351B4] outline-none"
      />
      {/* Participant Filter */}
      <select
        value={participant}
        onChange={e => onParticipantChange(e.target.value)}
        className="w-full sm:w-auto px-3 py-2 rounded-sm border border-gray-300 bg-white text-gray-900 focus:ring-1 focus:ring-[#1351B4] focus:border-[#1351B4] outline-none"
      >
        <option value="">Todos os participantes</option>
        {participantsOptions.map((p, idx) => (
          <option key={idx} value={p}>{p}</option>
        ))}
      </select>
    </section>
  );
};

export default DebateFilterBar;
