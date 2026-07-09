// src/components/ui/Toast.jsx
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onClose?.(); }, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!visible) return null;

  const isSuccess = type === 'success';
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300
        ${isSuccess
          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
          : 'bg-rose-950 border-rose-700 text-rose-300'
        }`}
    >
      {isSuccess ? <CheckCircle size={16} /> : <XCircle size={16} />}
      <span>{message}</span>
      <button onClick={() => { setVisible(false); onClose?.(); }} className="ml-1 hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  );
}
