'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ThinkingAnimationProps {
  duration?: number;
  complete?: boolean;
}

export default function ThinkingAnimation({ duration = 20, complete = false }: ThinkingAnimationProps) {
  const [progress, setProgress] = useState(0);
  
  // Simulates progress over the duration
  useEffect(() => {
    // Reset progress when component mounts
    setProgress(0);
    
    if (complete) {
      // When complete prop is true, animate to 100%
      setProgress(100);
      return;
    }
    
    const intervalTime = 100; // Update every 100ms
    const incrementAmount = 100 / (duration * 1000 / intervalTime);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        // Cap at 95% until complete
        const newProgress = prev + incrementAmount;
        return newProgress < 95 ? newProgress : 95;
      });
    }, intervalTime);
    
    return () => {
      clearInterval(interval);
    };
  }, [duration, complete]);

  return (
    <div className="flex flex-col items-center justify-center py-3 w-80">
      {/* Simple progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-2 shadow-inner overflow-hidden">
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-300 ease-out shadow-sm"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Text Label */}
      <div className="text-xs text-slate-500 font-medium text-center mt-1">
        Thinking...
      </div>
    </div>
  );
} 