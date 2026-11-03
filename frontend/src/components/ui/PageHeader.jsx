export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-500)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
