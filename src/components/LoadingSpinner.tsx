'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

/**
 * Premium loading spinner with gradient border
 */
export function LoadingSpinner({ 
  size = 'md', 
  className = '',
  label = 'Loading...'
}: LoadingSpinnerProps) {
  return (
    <div 
      role="status" 
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <div 
        className={`
          ${sizeClasses[size]}
          rounded-full
          border-white/20
          border-t-violet-500
          animate-spin
        `}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Full-page loading overlay
 */
interface LoadingOverlayProps {
  message?: string;
  show?: boolean;
}

export function LoadingOverlay({ 
  message = 'Loading...', 
  show = true 
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-fade-in"
      role="alert"
      aria-busy="true"
    >
      {/* Animated logo */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
          <span className="text-4xl">✨</span>
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-violet-400/50 animate-spin" />
      </div>
      
      <p className="text-white/80 text-lg font-medium">{message}</p>
      
      {/* Loading bar */}
      <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full animate-loading-bar" />
      </div>
    </div>
  );
}

/**
 * Button loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText = 'Loading...',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`relative ${className}`}
      aria-busy={loading}
    >
      <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm">{loadingText}</span>
        </span>
      )}
    </button>
  );
}

/**
 * Content placeholder with shimmer effect
 */
interface PlaceholderProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

export function Placeholder({
  width,
  height,
  className = '',
  rounded = 'md'
}: PlaceholderProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton ${roundedClasses[rounded]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Text placeholder for loading states
 */
interface TextPlaceholderProps {
  lines?: number;
  className?: string;
}

export function TextPlaceholder({ lines = 3, className = '' }: TextPlaceholderProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Placeholder
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
}

/**
 * Avatar placeholder
 */
interface AvatarPlaceholderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function AvatarPlaceholder({ size = 'md', className = '' }: AvatarPlaceholderProps) {
  return (
    <div 
      className={`skeleton rounded-full ${avatarSizes[size]} ${className}`}
      aria-hidden="true"
    />
  );
}
