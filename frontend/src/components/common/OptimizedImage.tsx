import React, { useState, useEffect } from "react";
import { getOptimizedImageUrl } from "../../lib/api";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  width?: number | string;
  className?: string;
  fallbackSrc?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  width = "auto", 
  className = "", 
  fallbackSrc = "https://placehold.co/600x800?text=NA",
  alt = "image",
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");

  useEffect(() => {
    setError(false);
    setLoaded(false);
    
    const optimized = getOptimizedImageUrl(src, width);
    if (!optimized) {
      setCurrentSrc(fallbackSrc);
      setLoaded(true);
      return;
    }

    setCurrentSrc(optimized);

    // Safety net: force load state after 4 seconds to prevent infinite spinners
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [src, width, fallbackSrc]);

  return (
    <div className={`relative bg-slate-900/60 rounded-inherit overflow-hidden animate-in fade-in duration-500 ${className}`}>
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => { 
            console.warn("OptimizedImage Load Fail:", currentSrc);
            setError(true); 
            setCurrentSrc(fallbackSrc); 
            setLoaded(true); 
          }}
          className={`w-full h-full object-cover transition-all duration-300 ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
          {...props}
        />
      )}
      
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm z-20">
           <div className="w-5 h-5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default React.memo(OptimizedImage);
