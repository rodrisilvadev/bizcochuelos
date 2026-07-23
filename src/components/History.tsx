import React from 'react';
import type { HistoryEntry } from '../types';
import { History as HistoryIcon, ShoppingBag } from 'lucide-react';

interface HistoryProps {
  history: HistoryEntry[];
}

const formatDate = (dateStr: string): string =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

export const History: React.FC<HistoryProps> = ({ history }) => {
  const entries = [...history].reverse();

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
          <span className="text-sm font-extrabold text-carbon-dark dark:text-white">Historial de compras</span>
        </div>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">Pedidos de miércoles pasados</p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white dark:bg-carbon-gray rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-200 dark:text-white/15 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">Todavía no hay historial</p>
          <p className="text-xs text-gray-300 dark:text-gray-500 mt-0.5">Se va a ir completando cada miércoles que pase el turno.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={`${entry.date}-${entry.buyerId}`}
              className="bg-white dark:bg-carbon-gray rounded-3xl border border-gray-100 dark:border-white/10 shadow-card overflow-hidden"
            >
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-dashed border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-xs font-extrabold text-carbon-dark dark:text-white capitalize">{formatDate(entry.date)}</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                    Compró: <span className="font-bold text-gray-500 dark:text-gray-400">{entry.buyerName}</span>
                  </p>
                </div>
                <span className="text-xs font-black text-apple-green bg-apple-green/10 px-2.5 py-1 rounded-full border border-apple-green/20 flex-shrink-0">
                  {entry.total} bizcochos
                </span>
              </div>

              {Object.keys(entry.items).length > 0 && (
                <div className="px-5 py-3 flex flex-wrap gap-1.5">
                  {Object.entries(entry.items)
                    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                    .map(([type, count]) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 text-[11px] font-bold text-carbon-dark dark:text-white"
                      >
                        <span className="w-4 h-4 rounded-md bg-apple-green/15 text-apple-green text-[9px] font-black flex items-center justify-center">
                          {count}
                        </span>
                        {type}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
