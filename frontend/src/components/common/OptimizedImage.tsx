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
  fallbackSrc = "https://placehold.co/600x800?text=Image+Not+Available",
  alt = "Post image",
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => src ? getOptimizedImageUrl(src, width) : fallbackSrc);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [hasCheckedCache, setHasCheckedCache] = useState(false);

  React.useLayoutEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
    setHasCheckedCache(true);
  }, [currentSrc]);

  useEffect(() => {
    if (src) {
      setCurrentSrc(getOptimizedImageUrl(src, width));
      setLoaded(false);
      setError(false);
    } else {
      setCurrentSrc(fallbackSrc);
      setLoaded(true); // fallbacks shouldn't spin usually
      setError(false);
    }
  }, [src, width, fallbackSrc]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Skeleton / Placeholder */}
      {/* Skeleton / Placeholder */}
      {!loaded && !error && hasCheckedCache && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-20">
          <div className="w-6 h-6 border-2 border-slate-800 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100 relative z-10" : "opacity-0"}`}
          {...props}
        />
      )}
    </div>
  );
};

export default React.memo(OptimizedImage);
