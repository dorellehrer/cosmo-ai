'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Notification, NotificationType } from '@/contexts/NotificationsContext';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const typeConfig: Record<NotificationType, { icon: string; gradient: string; borderColor: string }> = {
  success: {
    icon: '✓',
    gradient: 'from-emerald-500 to-green-600',
    borderColor: 'border-emerald-500/50',
  },
  error: {
    icon: '✕',
    gradient: 'from-red-500 to-rose-600',
    borderColor: 'border-red-500/50',
  },
  warning: {
    icon: '⚠',
    gradient: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/50',
  },
  info: {
    icon: 'ℹ',
    gradient: 'from-violet-500 to-purple-600',
    borderColor: 'border-violet-500/50',
  },
};

export function Toast({ notification, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const config = typeConfig[notification.type];

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative max-w-sm w-full bg-slate-900/95 backdrop-blur-xl 
        rounded-xl shadow-2xl shadow-black/20 overflow-hidden
        border ${config.borderColor}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${config.gradient} animate-toast-progress`}
          style={{ animationDuration: '5s' }}
        />
      </div>

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${config.gradient}
            flex items-center justify-center text-white text-sm font-bold
            shadow-lg
          `}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">
            {notification.title}
          </h4>
          <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          {notification.action && (
            notification.action.href ? (
              <Link
                href={notification.action.href}
                className={`
                  inline-block mt-2 text-xs font-medium 
                  bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent
                  hover:underline
                `}
                onClick={handleDismiss}
              >
                {notification.action.label} →
              </Link>
            ) : (
              <button
                onClick={() => {
                  notification.action?.onClick?.();
                  handleDismiss();
                }}
                className={`
                  mt-2 text-xs font-medium 
                  bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent
                  hover:underline
                `}
              >
                {notification.action.label} →
              </button>
            )
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
