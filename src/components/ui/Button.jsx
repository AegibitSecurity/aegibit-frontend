/**
 * Button — Premium button with multiple variants and sizes.
 *
 * Variants: primary, secondary, ghost, danger, success
 * Sizes:    sm, md, lg
 * States:   loading, disabled
 */

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  ...props
}) {
  const base = [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-lg',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.97]',
    'select-none',
  ].join(' ');

  const variants = {
    primary: [
      'bg-primary text-white',
      'hover:bg-primary-hover hover:shadow-lg hover:shadow-primary-glow',
      'focus:ring-primary/50',
    ].join(' '),
    secondary: [
      'bg-bg-elevated text-text-primary border border-border-default',
      'hover:bg-bg-hover hover:border-text-muted/30',
      'focus:ring-border-focus',
    ].join(' '),
    ghost: [
      'bg-transparent text-text-secondary',
      'hover:bg-bg-hover hover:text-text-primary',
      'focus:ring-border-focus',
    ].join(' '),
    danger: [
      'bg-danger/10 text-danger border border-danger/20',
      'hover:bg-danger hover:text-white hover:border-danger',
      'focus:ring-danger/50',
    ].join(' '),
    success: [
      'bg-success/10 text-success border border-success/20',
      'hover:bg-success hover:text-white hover:border-success',
      'focus:ring-success/50',
    ].join(' '),
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-md',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size} />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

function Spinner({ size = 'md' }) {
  const sizeMap = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  return (
    <svg
      className={`animate-spin ${sizeMap[size]}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
