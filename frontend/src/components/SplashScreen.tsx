import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Premium Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-green-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
          className="relative w-36 h-36 rounded-[3rem] bg-slate-900 border border-slate-800 flex items-center justify-center p-4 mb-10 shadow-[0_0_50px_rgba(34,197,94,0.15)]"
        >
          <img src="/logo.png" alt="Logo" className="w-24 h-auto" />
          
          {/* Pulsing Active Signal */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute bottom-4 right-4 w-5 h-5 bg-green-500 rounded-full border-[4px] border-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.8)]"
          >
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full bg-green-500 rounded-full"
            />
          </motion.div>
        </motion.div>

        {/* Brand Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-7xl font-black text-white mb-3 tracking-tighter uppercase">EHH</h1>
          
          <div className="flex items-center gap-4">
             <div className="h-[2px] w-10 bg-green-500/40"></div>
             <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.4em]">Environmental Human Hub</p>
             <div className="h-[2px] w-10 bg-green-500/40"></div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-16 flex flex-col items-center"
      >
        <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase animate-pulse">Initializing Secure Protocol...</p>
      </motion.div>
    </div>
  );
}
