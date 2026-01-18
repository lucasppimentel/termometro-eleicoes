import React from "react";
import { motion } from "framer-motion";

const meshBg = "bg-gradient-to-tr from-indigo-50 via-fuchsia-50 to-indigo-100 bg-opacity-90 backdrop-blur-lg";

const HeaderBanner = () => (
  <motion.header
    initial={{ opacity: 0, y: -28 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.85, ease: "circOut" }}
    className={`mb-10 text-center border-none shadow-xl rounded-3xl px-6 pt-10 pb-14 mx-auto mt-2 relative overflow-hidden ${meshBg}`}
    style={{ maxWidth: '54rem', border: '2px solid rgba(200,200,232,0.08)'}}
  >
    <div className="absolute inset-0 z-0" aria-hidden="true" style={{
        background: 'radial-gradient(circle at 60% 40%,rgba(122,108,232,0.13) 0,rgba(255,255,255,0.0) 58%)', pointerEvents:'none'}} />
    <div className="mb-4 w-full max-w-xl mx-auto bg-yellow-50/80 border border-yellow-200 rounded-md p-3 shadow-md backdrop-blur-xl relative z-10">
      <p className="text-sm sm:text-base font-semibold text-yellow-900 leading-tight">
        Quer acesso aos dados? <span className="font-extrabold">Use nossa API!</span>
      </p>
    </div>
    <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight drop-shadow-2xl [text-shadow:0_6px_24px_rgba(174,154,255,0.14)] mt-2 mb-2 relative z-10">
      🏛️ Repositório de Debates
    </h1>
    <p className="mt-3 text-2xl text-slate-700 font-semibold max-w-2xl mx-auto z-10 relative">
      Explore debates e veja a performance avaliada dos participantes com dados em tempo real.
    </p>
  </motion.header>
);

export default HeaderBanner;
