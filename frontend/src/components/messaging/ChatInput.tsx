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
    <div className="flex items-end gap-3 w-full">
      <button className="p-4 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 rounded-2xl mb-1">
        <Paperclip size={22} />
      </button>
      
      <div className="flex-1 relative bg-slate-50 rounded-[2.5rem] border border-slate-100 focus-within:border-slate-300 focus-within:bg-white transition-all duration-300 px-6 py-1 shadow-sm">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Transmit signal..."
          className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-slate-800 py-4 resize-none max-h-[150px] chat-scrollbar placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px]"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-6 bottom-4 flex items-center gap-2">
          <button className="text-slate-300 hover:text-slate-900 transition-colors">
            <Smile size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {text.trim() && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0, x: 10 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.8, opacity: 0, x: 10 }}
            onClick={handleSubmit}
            className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-2xl hover:bg-slate-800 active:scale-90 transition-all mb-1"
          >
            <Send size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInput;
