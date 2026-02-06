'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode, useRef } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Page transition wrapper that provides a subtle fade effect between route changes.
 * Uses CSS transitions for performance and respects prefers-reduced-motion.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    // Check if route actually changed (not just a re-render)
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      if (prefersReducedMotion) {
        // Skip animation for users who prefer reduced motion
        setDisplayChildren(children);
        return;
      }

      // Start transition
      setIsTransitioning(true);
      
      // After fade out, update content and fade in
      const transitionTimer = setTimeout(() => {
        setDisplayChildren(children);
        setIsTransitioning(false);
      }, 150); // Match the CSS transition duration

      return () => clearTimeout(transitionTimer);
    } else {
      // Same route, just update children immediately
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div 
      className={`page-transition ${isTransitioning ? 'page-transition-exit' : 'page-transition-enter'}`}
      style={{
        minHeight: '100vh',
      }}
    >
      {displayChildren}
    </div>
  );
}

/**
 * Lazy loading wrapper with intersection observer for off-screen content.
 * Use this for heavy components that are below the fold.
 */
interface LazyLoadProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  fallback?: ReactNode;
}

export function LazyLoad({ 
  children, 
  className = '',
  threshold = 0.1,
  rootMargin = '100px',
  fallback = null 
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Check for IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasLoaded(true);
            observer.unobserve(element);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return (
    <div 
      ref={elementRef} 
      className={`${className} ${hasLoaded ? 'animate-fade-in' : ''}`}
    >
      {isVisible ? children : fallback}
    </div>
  );
}

/**
 * Fade-in animation wrapper for staggered list items.
 * Useful for animating lists of cards or items.
 */
interface FadeInStaggerProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number; // Delay between each item in ms
  initialDelay?: number; // Initial delay before first item
}

export function FadeInStagger({ 
  children, 
  className = '',
  staggerDelay = 50,
  initialDelay = 0
}: FadeInStaggerProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{
            animationDelay: `${initialDelay + index * staggerDelay}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
