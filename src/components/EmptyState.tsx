import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

// Estado vacío de página completa: usado cuando una pestaña entera (Integrantes,
// Historial) todavía no tiene nada que mostrar.
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, subtitle }) => (
  <div className="bg-white dark:bg-carbon-gray rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
    <Icon className="w-12 h-12 text-gray-200 dark:text-white/15 mx-auto mb-3" />
    <p className="text-sm font-bold text-gray-400">{title}</p>
    {subtitle && <p className="text-xs text-gray-300 dark:text-gray-500 mt-0.5">{subtitle}</p>}
  </div>
);

export default EmptyState;
