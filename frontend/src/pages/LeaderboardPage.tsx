import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import api from "../lib/api";
import { Trophy, MapPin, Globe, Zap, Award, Star, Medal } from "lucide-react";
import OptimizedImage from "../components/common/OptimizedImage";

interface Leader {
  id: number;
  name: string;
  avatar: string | null;
  points: number;
  level: string;
  streak: number;
  district: string | null;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"national" | "district">("national");
  const [userDistrict, setUserDistrict] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaders();
  }, [filter]);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/leaderboard${filter === "district" && userDistrict ? `?district=${userDistrict}` : ""}`);
      setLeaders(res.data.leaders || []);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-black uppercase tracking-widest"
        >
          <Trophy size={14} /> Eco Warrior Rankings
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">Leaderboard</h1>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">The most active contributors to our planet</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center p-1 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-xl w-fit mx-auto">
        <button 
          onClick={() => setFilter("national")}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === "national" ? "bg-green-500 text-slate-900 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "text-slate-500 hover:text-white"}`}
        >
          <Globe size={14} /> National
        </button>
        <button 
          onClick={() => setFilter("district")}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === "district" ? "bg-green-500 text-slate-900 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "text-slate-500 hover:text-white"}`}
        >
          <MapPin size={14} /> Local District
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 w-full bg-slate-800/50 rounded-2xl animate-pulse border border-slate-700/30" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 Spotlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {leaders.slice(0, 3).map((leader, i) => (
              <motion.div 
                key={leader.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-8 rounded-[2.5rem] border flex flex-col items-center text-center space-y-4 ${
                  i === 0 ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30 ring-1 ring-yellow-500/20 scale-110 z-10" :
                  i === 1 ? "bg-slate-800/80 border-slate-700/50" :
                  "bg-slate-800/80 border-slate-700/50"
                }`}
              >
                <div className="absolute -top-4 -right-4 p-4 bg-slate-900 rounded-full border border-slate-700 shadow-xl">
                   {i === 0 ? <Medal className="text-yellow-500" size={24} /> : i === 1 ? <Medal className="text-slate-300" size={20} /> : <Medal className="text-orange-500" size={18} />}
                </div>
                
                <div className="relative">
                  <div className={`p-1 rounded-full ${i === 0 ? "bg-yellow-500" : "bg-slate-700"}`}>
                    <OptimizedImage src={leader.avatar || ""} width={100} className="w-20 h-20 rounded-full" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700 text-[8px] font-black text-green-500 uppercase">
                    {leader.streak}d 🔥
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-black text-white">{leader.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{leader.level}</p>
                </div>
                
                <div className="px-6 py-2 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-xl font-black text-green-500">{leader.points}</span>
                  <span className="text-[8px] text-slate-500 font-bold ml-1 uppercase">pts</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* List View */}
          <div className="bg-slate-800/50 rounded-[2.5rem] border border-slate-700/50 overflow-hidden">
            {leaders.slice(3).map((leader, i) => (
              <motion.div 
                key={leader.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-6 p-6 hover:bg-slate-700/30 transition-colors border-b border-slate-700/50 last:border-0"
              >
                <div className="w-10 text-xl font-black text-slate-600">#{i + 4}</div>
                
                <OptimizedImage src={leader.avatar || ""} width={50} className="w-12 h-12 rounded-xl border border-slate-700" />
                
                <div className="flex-1">
                  <h4 className="font-black text-white text-sm uppercase tracking-tight">{leader.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{leader.level}</span>
                    {leader.district && (
                      <span className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest flex items-center gap-1">
                        <MapPin size={10} /> {leader.district}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-black text-green-500">{leader.points}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase">Points</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-700">
                    <Zap size={14} className="text-yellow-500" />
                  </div>
                </div>
              </motion.div>
            ))}
            
            {leaders.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <Award size={48} className="text-slate-700 mx-auto" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No rankings available for this region</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
