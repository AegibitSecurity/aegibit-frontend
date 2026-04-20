/**
 * Badge — Status indicator pill with semantic colors.
 *
 * Variants: success, warning, danger, info, neutral
 * Sizes:    sm, md
 *
 * Usage:
 *   <Badge variant="success">Approved</Badge>
 *   <Badge variant="danger" dot>Rejected</Badge>
 */

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-full select-none';

  const variants = {
    success: 'bg-success/12 text-success border border-success/20',
    warning: 'bg-warning/12 text-warning border border-warning/20',
    danger: 'bg-danger/12 text-danger border border-danger/20',
    info: 'bg-primary/12 text-primary border border-primary/20',
    neutral: 'bg-bg-elevated text-text-secondary border border-border-subtle',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wide uppercase',
    md: 'text-xs px-2.5 py-1',
  };

  const dotColors = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-primary',
    neutral: 'bg-text-muted',
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
