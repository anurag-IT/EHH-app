import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#fdfcfb] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-100/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-slate-200/50 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
          className="relative w-32 h-32 rounded-[2.5rem] bg-white border border-slate-100 flex items-center justify-center p-4 mb-8 shadow-2xl shadow-slate-200/50"
        >
          <img src="/logo.png" alt="Logo" className="w-20 h-auto" />
          
          {/* Pulsing Red Dot */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute bottom-3 right-3 w-4 h-4 bg-red-500 rounded-full border-[3px] border-white shadow-[0_0_10px_rgba(239,68,68,0.6)]"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full bg-red-500 rounded-full"
            />
          </motion.div>
        </motion.div>

        {/* Brand Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-6xl font-black text-slate-900 mb-2 tracking-tighter uppercase">EHH</h1>
          
          <div className="flex items-center gap-3">
             <div className="h-[2px] w-8 bg-emerald-400 opacity-60"></div>
             <p className="text-[11px] font-bold uppercase text-slate-400 tracking-[0.3em]">Network Protocol</p>
             <div className="h-[2px] w-8 bg-emerald-400 opacity-60"></div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-12 flex flex-col items-center"
      >
        <p className="text-[10px] font-bold text-slate-300 tracking-[0.25em] uppercase">Identity Archive V2.4-STABLE</p>
      </motion.div>
    </div>
  );
}
