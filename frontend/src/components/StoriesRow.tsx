import React from "react";
import { motion } from "motion/react";
import OptimizedImage from "./common/OptimizedImage";

const STORY_DATA = [
  { id: 1, name: "NASA", avatar: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=100&h=100&fit=crop" },
  { id: 2, name: "SpaceX", avatar: "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=100&h=100&fit=crop" },
  { id: 3, name: "Artemis", avatar: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=100&h=100&fit=crop" },
  { id: 4, name: "Hubble", avatar: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=100&h=100&fit=crop" },
  { id: 5, name: "Voyager", avatar: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=100&h=100&fit=crop" },
  { id: 6, name: "Orion", avatar: "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=100&h=100&fit=crop" },
  { id: 7, name: "Mars Rover", avatar: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=100&h=100&fit=crop" },
];

export default function StoriesRow() {
  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-hide px-2">
      {STORY_DATA.map((story, i) => (
        <motion.div 
          key={story.id} 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group"
        >
          <div className="relative p-1 rounded-full border-2 border-transparent bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
            <div className="p-0.5 bg-slate-900 rounded-full">
              <OptimizedImage 
                src={story.avatar} 
                width={100} 
                className="w-16 h-16 rounded-full border-2 border-slate-900" 
              />
            </div>
            {i === 0 && (
               <div className="absolute bottom-1 right-1 w-5 h-5 bg-blue-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg">+</div>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
            {story.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
