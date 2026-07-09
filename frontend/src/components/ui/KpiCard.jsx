// src/components/ui/KpiCard.jsx
export default function KpiCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        {loading ? (
          <div className="skeleton h-7 w-20 mt-1" />
        ) : (
          <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text)' }}>
            {value ?? '—'}
          </p>
        )}
      </div>
    </div>
  );
}
