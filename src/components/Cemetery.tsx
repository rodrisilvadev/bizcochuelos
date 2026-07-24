import React from 'react';
import type { CemeteryEntry } from '../types';
import { EmptyState } from './EmptyState';
import { Cross } from 'lucide-react';

interface CemeteryProps {
  cemetery: CemeteryEntry[];
}

const formatMonth = (month: string): string =>
  new Date(month + '-01T12:00:00').toLocaleDateString('es-AR', {
    month: 'long', year: 'numeric',
  });

// El Cementerio Harinoso: integrantes que se fueron del grupo, con el mes en
// que se despidieron. Solo informativo — nadie vuelve de acá.
export const Cemetery: React.FC<CemeteryProps> = ({ cemetery }) => {
  const entries = [...cemetery].reverse();

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <Cross className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
          <span className="text-sm font-extrabold text-carbon-dark dark:text-white">Cementerio Harinoso</span>
        </div>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">Descansen en harina</p>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Cross} title="Todavía no hay bajas" subtitle="Que así siga." />
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={`${entry.name}-${entry.month}`}
              className="bg-white dark:bg-carbon-gray rounded-3xl border border-gray-100 dark:border-white/10 shadow-card px-5 py-4 flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                <Cross className="w-4 h-4 text-gray-300 dark:text-gray-600" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-gray-400 dark:text-gray-500 text-base leading-tight line-through decoration-2">
                  {entry.name}
                </p>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5 capitalize">
                  {formatMonth(entry.month)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Cemetery;
