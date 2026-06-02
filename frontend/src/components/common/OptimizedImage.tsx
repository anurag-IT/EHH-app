import React, { useState, useEffect, useRef } from "react";
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
  const [currentSrc, setCurrentSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    const safeSrc = src && (src.startsWith('http://') || src.startsWith('https://')) ? src : fallbackSrc;
    const optimized = getOptimizedImageUrl(safeSrc, width) || fallbackSrc;
    setCurrentSrc(optimized);
  }, [src, width, fallbackSrc]);

  // If image is already cached by browser, onLoad fires before React sees it
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [currentSrc]);

  const objectFitClass = className.includes('object-contain') ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative bg-slate-900/60 rounded-inherit overflow-hidden ${className}`}>
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setCurrentSrc(fallbackSrc);
            setLoaded(true);
          }}
          className={`w-full h-full ${objectFitClass} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          {...props}
        />
      )}

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 z-20">
          <div className="w-5 h-5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default React.memo(OptimizedImage);
