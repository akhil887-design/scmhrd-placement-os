export function Card({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl bg-surface-card shadow-soft border border-black/5 p-6 ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
