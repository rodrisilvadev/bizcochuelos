import React, { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { onSyncError } from '../services/db';

interface ToastItem {
  id: number;
  message: string;
}

let nextToastId = 0;
const TOAST_DURATION_MS = 6000;

// Se suscribe a los errores de guardado de db.ts y los muestra como toasts
// flotantes. Sin esto, un fallo de red o de token era invisible para quien
// estaba usando la app.
export const SyncErrorToasts: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return onSyncError(message => {
      const id = nextToastId++;
      setToasts(prev => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, TOAST_DURATION_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[80] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm space-y-2 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-white dark:bg-carbon-gray border border-amber-200 dark:border-amber-500/30 shadow-lifted animate-fade-up"
        >
          <CloudOff className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
};

export default SyncErrorToasts;
