import React from 'react';
import type { CemeteryEntry } from '../types';
import { EmptyState } from './EmptyState';
import { TombstoneIcon } from './TombstoneIcon';

interface CemeteryProps {
  cemetery: CemeteryEntry[];
}

const formatMonthShort = (month: string): string => {
  const d = new Date(month + '-01T12:00:00');
  const label = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  return `${label} ${d.getFullYear()}`;
};

// El Cementerio Harinoso: integrantes que se fueron del grupo, con el mes en
// que se despidieron y su epitafio. Solo informativo — nadie vuelve de acá.
export const Cemetery: React.FC<CemeteryProps> = ({ cemetery }) => {
  const entries = [...cemetery].reverse();

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <TombstoneIcon className="w-4 h-4.5 text-apple-green" />
          <span className="text-sm font-extrabold text-carbon-dark dark:text-white">Cementerio Harinoso</span>
        </div>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">Descansen en harina</p>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={TombstoneIcon} title="Todavía no hay bajas" subtitle="Que así siga." />
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={`${entry.name}-${entry.month}`}
              className="bg-white dark:bg-carbon-gray rounded-3xl border border-gray-100 dark:border-white/10 shadow-card px-5 py-4 flex items-start gap-4"
            >
              <div className="flex flex-col items-center gap-1 flex-shrink-0 w-11">
                <TombstoneIcon className="w-7 h-8 text-gray-300 dark:text-gray-600" />
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 capitalize whitespace-nowrap">
                  {formatMonthShort(entry.month)}
                </span>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-medium text-gray-500 dark:text-gray-400 text-base leading-tight line-through decoration-2 decoration-gray-300 dark:decoration-gray-600">
                  {entry.name}
                </p>
                {entry.reason && (
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 font-medium mt-1 leading-snug">
                    {entry.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Cemetery;
