'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

interface ShortcutHintProps {
  children: ReactNode;
  shortcut: string;
  description?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

/**
 * Wraps a component and shows a tooltip with keyboard shortcut hint on hover.
 */
export function ShortcutHint({ 
  children, 
  shortcut, 
  description,
  position = 'top',
  delay = 500,
}: ShortcutHintProps) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800',
  };

  const renderShortcutKeys = (keys: string) => {
    // Split by + for modifier keys, or by space for sequences
    const parts = keys.includes('+') ? keys.split('+') : keys.split(' ');
    return parts.map((key, idx) => (
      <span key={idx} className="inline-flex items-center">
        {idx > 0 && (keys.includes('+') ? (
          <span className="mx-0.5 text-white/30">+</span>
        ) : (
          <span className="mx-0.5 text-white/30">then</span>
        ))}
        <kbd className="min-w-[20px] h-5 inline-flex items-center justify-center px-1 text-[10px] font-medium text-white/90 bg-white/10 rounded border border-white/20">
          {key.trim()}
        </kbd>
      </span>
    ));
  };

  return (
    <div 
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {show && (
        <div 
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none animate-fade-in`}
          role="tooltip"
        >
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 shadow-xl whitespace-nowrap">
            <div className="flex items-center gap-2">
              {description && (
                <span className="text-xs text-white/70">{description}</span>
              )}
              <div className="flex items-center">
                {renderShortcutKeys(shortcut)}
              </div>
            </div>
          </div>
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}

/**
 * Simple inline keyboard key badge
 */
export function KeyBadge({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium text-white/60 bg-white/5 rounded border border-white/10">
      {children}
    </kbd>
  );
}

/**
 * Shortcut indicator that shows in the corner of a button
 */
export function ShortcutBadge({ shortcut, className = '' }: { shortcut: string; className?: string }) {
  const keys = shortcut.includes('+') ? shortcut.split('+') : shortcut.split(' ');
  
  return (
    <div className={`hidden sm:flex items-center gap-0.5 ${className}`}>
      {keys.map((key, idx) => (
        <kbd 
          key={idx}
          className="min-w-[18px] h-[18px] inline-flex items-center justify-center px-1 text-[9px] font-medium text-white/40 bg-white/5 rounded border border-white/10"
        >
          {key.trim()}
        </kbd>
      ))}
    </div>
  );
}
