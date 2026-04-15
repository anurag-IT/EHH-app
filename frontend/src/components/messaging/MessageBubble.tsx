import React from "react";
import { motion } from "motion/react";

interface MessageBubbleProps {
  content: string;
  isSender: boolean;
  timestamp: string | Date;
  isRead?: boolean;
}

const MessageBubble = React.memo(({ content, isSender, timestamp, isRead }: MessageBubbleProps) => {
  const time = new Date(timestamp);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-4 px-4`}
    >
      <div className={`max-w-[75%] relative group`}>
        <div className={`
          px-5 py-3.5 rounded-[1.8rem] text-[13px] font-medium leading-relaxed shadow-sm
          ${isSender 
            ? 'bg-slate-900 text-white rounded-br-none' 
            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}
        `}>
          {content}
        </div>
        
        <div className={`
          flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300
          ${isSender ? 'justify-end pr-2' : 'justify-start pl-2'}
        `}>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isSender && (
            <div className={`w-1 h-1 rounded-full ${isRead ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
