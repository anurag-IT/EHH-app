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
          px-5 py-3.5 rounded-[1.8rem] text-[13px] font-medium leading-relaxed shadow-sm transition-all duration-300
          ${isSender 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none shadow-[0_4px_15px_rgba(59,130,246,0.2)]' 
            : 'bg-slate-800 text-white border border-slate-700/50 rounded-bl-none shadow-sm'}
        `}>
          {content}
        </div>
        
        <div className={`
          flex items-center gap-1.5 mt-1.5 opacity-60 transition-opacity duration-300
          ${isSender ? 'justify-end pr-2' : 'justify-start pl-2'}
        `}>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-1">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isSender && (
               <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${isRead ? 'text-green-500' : 'text-slate-500'}`}><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
