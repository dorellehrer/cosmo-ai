'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications, Notification, NotificationType } from '@/contexts/NotificationsContext';

const typeConfig: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  success: {
    icon: '✓',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
  },
  error: {
    icon: '✕',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
  },
  warning: {
    icon: '⚠',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
  info: {
    icon: 'ℹ',
    color: 'text-violet-400',
    bg: 'bg-violet-500/20',
  },
};

function NotificationItem({
  notification,
  onMarkRead,
  onClear,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClear: (id: string) => void;
}) {
  const config = typeConfig[notification.type];
  const timeAgo = getTimeAgo(notification.timestamp);

  return (
    <div
      className={`
        relative p-3 hover:bg-white/5 transition-colors cursor-pointer group
        ${!notification.read ? 'bg-violet-500/5' : ''}
      `}
      onClick={() => onMarkRead(notification.id)}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute top-3 left-1.5 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
      )}

      <div className="flex items-start gap-3 ps-3">
        {/* Type icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center ${config.color} text-sm`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium ${notification.read ? 'text-white/70' : 'text-white'} truncate`}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-white/40 flex-shrink-0">
              {timeAgo}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          {notification.action && (
            notification.action.href ? (
              <Link
                href={notification.action.href}
                className="inline-block mt-1.5 text-xs font-medium text-violet-400 hover:text-violet-300"
                onClick={(e) => e.stopPropagation()}
              >
                {notification.action.label} →
              </Link>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  notification.action?.onClick?.();
                }}
                className="mt-1.5 text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                {notification.action.label} →
              </button>
            )
          )}
        </div>

        {/* Clear button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear(notification.id);
          }}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
          aria-label="Remove notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-all
          ${isOpen ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}
        `}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={unreadCount > 0 ? 'animate-bell-ring' : ''}
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full end-0 mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/20 overflow-hidden animate-dropdown-in z-50"
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-normal text-white/50">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-white/40 hover:text-white/60 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <p className="text-white/50 text-sm">No notifications yet</p>
                <p className="text-white/30 text-xs mt-1">
                  We&apos;ll notify you about important updates
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onClear={clearNotification}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-white/10 bg-white/5">
              <p className="text-xs text-white/40 text-center">
                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
