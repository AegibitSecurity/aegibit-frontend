/**
 * Card — Premium glassmorphic container component.
 *
 * Variants: default, elevated, interactive
 * Usage:   <Card>content</Card>
 *          <Card variant="elevated" className="p-8">...</Card>
 */

export default function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  ...props
}) {
  const base = [
    'rounded-xl border transition-all duration-200',
    'backdrop-blur-sm',
  ].join(' ');

  const variants = {
    default: 'bg-bg-card border-border-subtle shadow-lg shadow-black/20',
    elevated: 'bg-bg-elevated border-border-default shadow-xl shadow-black/30',
    interactive: [
      'bg-bg-card border-border-subtle shadow-lg shadow-black/20',
      'hover:bg-bg-hover hover:border-border-default hover:shadow-xl',
      'cursor-pointer active:scale-[0.995]',
    ].join(' '),
  };

  return (
    <div
      className={`${base} ${variants[variant] || variants.default} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader — Consistent header with title + optional action.
 */
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b border-border-subtle ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {subtitle && (
          <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * CardBody — Padded content area.
 */
export function CardBody({ children, className = '' }) {
  return (
    <div className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}
