import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";

export default function VideoMomentModal({ youtubeId, startTime, onClose, debateTitle }) {
  if (!youtubeId) return null;
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(startTime)}&autoplay=1`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl max-w-4xl w-full relative p-6 overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ isolation: "isolate" }}
        >
          {/* Glass panel layer */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 rounded-3xl bg-white/30 backdrop-blur-lg"
          />
          
          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 text-gray-700 hover:bg-white/80 transition-colors shadow-lg"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Content */}
          <div className="relative z-10">
            <h3 className="font-extrabold text-2xl text-gray-900 mb-4 pr-12">
              {debateTitle || "Vídeo do Debate"}
            </h3>
            <div className="rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl">
              <iframe
                width="100%"
                height="450"
                src={embedUrl}
                title="YouTube Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-2xl"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
