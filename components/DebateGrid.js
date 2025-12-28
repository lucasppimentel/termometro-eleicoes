import React from "react";
import DebateCard from "./DebateCard";
// Removed motion and AnimatePresence imports

const DebateGrid = ({ debates }) => {
  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      {debates.map(debate => (
        <div key={debate.id}>
          <DebateCard debate={debate} />
        </div>
      ))}
    </div>
  );
};
export default DebateGrid;
