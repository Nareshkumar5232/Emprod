// src/components/ui/ProductivityBadge.jsx
export default function ProductivityBadge({ value }) {
  if (!value) return null;
  const isHigh = value.includes('High');
  const isMedium = value.includes('Medium');
  const cls = isHigh ? 'badge-high' : isMedium ? 'badge-medium' : 'badge-low';
  const dot = isHigh ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span className={cls}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`} />
      {value}
    </span>
  );
}
