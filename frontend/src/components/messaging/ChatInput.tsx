import React, { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

const ChatInput = ({ onSendMessage, onTyping }: ChatInputProps) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Typing indicator logic
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
    
    // Auto-grow
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText("");
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end w-full relative">
      <div className="flex-1 flex items-center bg-[#151a18] rounded-[2.5rem] border border-slate-700/50 focus-within:border-green-500/30 transition-all duration-300 pr-2 pl-4 py-2 shadow-sm focus-within:shadow-[0_0_15px_rgba(34,197,94,0.1)]">
        
        <button className="p-2 text-slate-400 hover:text-green-500 transition-all rounded-full flex shrink-0">
          <div className="w-6 h-6 border-2 border-slate-400 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold leading-none -mt-0.5">+</span>
          </div>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-white px-3 py-3 resize-none max-h-[150px] chat-scrollbar placeholder:text-slate-500 placeholder:font-normal"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
        />
        
        <div className="flex items-center gap-2 shrink-0">
          <button className="p-3 text-slate-400 hover:text-green-500 transition-colors">
            <Smile size={20} />
          </button>

          <AnimatePresence mode="popLayout">
            {text.trim() && (
              <motion.button
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                onClick={handleSubmit}
                className="w-10 h-10 bg-green-500 text-slate-900 rounded-[1.5rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
