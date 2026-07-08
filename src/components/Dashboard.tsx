import React, { useState } from 'react';
import type { AppState, BizcochoType } from '../types';
import { BIZCOCHO_TYPES } from '../types';
import {
  ShoppingBag,
  ArrowRight,
  Layers,
  Sparkles,
  Clock,
  CalendarDays,
  ChevronDown,
  Users,
  X,
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  currentUser: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, currentUser }) => {
  const { users, buyerQueue, lastReviewer, lastReviewTimestamp } = state;

  const [showSchedule, setShowSchedule] = useState(false);
  const [expandedType, setExpandedType] = useState<BizcochoType | null>(null);

  const currentBuyer = users.find(u => u.id === buyerQueue[0]);
  const nextBuyer = users.find(u => u.id === buyerQueue[1]);

  // Aggregate totals
  const totals = BIZCOCHO_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<BizcochoType, number>);

  users.forEach(user => {
    BIZCOCHO_TYPES.forEach(type => {
      totals[type] += user.selections[type] || 0;
    });
  });

  const activeTotals = BIZCOCHO_TYPES
    .filter(type => totals[type] > 0)
    .map(type => ({ type, count: totals[type] }))
    .sort((a, b) => b.count - a.count);

  const grandTotal = Object.values(totals).reduce((s, c) => s + c, 0);

  // ── Wednesday date helpers ──
  const getUpcomingWednesday = (offsetWeeks = 0): Date => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun … 6=Sat
    let daysToWed = (3 - day + 7) % 7;
    if (daysToWed === 0 && day === 3 && d.getHours() >= 13) daysToWed = 7;
    d.setDate(d.getDate() + daysToWed + offsetWeeks * 7);
    return d;
  };

  const wednesdayFull = (offsetWeeks = 0): string =>
    getUpcomingWednesday(offsetWeeks).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

  const wednesdayShort = (offsetWeeks = 0): string =>
    getUpcomingWednesday(offsetWeeks).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric',
    });

  const wednesdayDayNum = (): string => String(getUpcomingWednesday().getDate());

  const wednesdayMonthLabel = (): string =>
    getUpcomingWednesday()
      .toLocaleDateString('es-AR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();

  const formatTime = (iso: string | null): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  // People who eat a given bizcocho type
  const peopleFor = (type: BizcochoType) =>
    users
      .filter(u => (u.selections[type] || 0) > 0)
      .map(u => ({ name: u.name, count: u.selections[type] }))
      .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HERO CARD: Quién compra ── */}
      <div className="glass-hero noise-overlay relative overflow-hidden rounded-3xl text-white shadow-lifted p-6 animate-fade-up">
        {/* Green glow blobs */}
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-apple-green/25 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-[60px] pointer-events-none" />

        {/* Top row */}
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-apple-green/15 border border-apple-green/30 text-apple-green text-[10px] font-extrabold tracking-widest uppercase">
              <Sparkles className="w-3 h-3" />
              Turno Activo
            </div>

            <div>
              <p className="text-[11px] text-gray-300/80 font-semibold uppercase tracking-wider mb-1">
                Le toca comprar:
              </p>
              <p className="text-3xl font-extrabold text-white tracking-tight truncate">
                {currentBuyer?.name ?? 'Sin asignar'}
              </p>
            </div>

            {nextBuyer && (
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 w-fit bg-white/8 border border-white/10">
                <span className="text-[10px] text-gray-300 font-bold">Siguiente:</span>
                <span className="text-xs text-apple-green font-extrabold flex items-center gap-1">
                  {nextBuyer.name}
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>

          {/* Calendar widget */}
          <div className="flex-shrink-0">
            <div className="w-[72px] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)] border border-white/15">
              <div className="bg-carbon-mid py-1 text-center">
                <span className="text-[9px] font-extrabold text-apple-green tracking-widest">
                  {wednesdayMonthLabel()}
                </span>
              </div>
              <div className="bg-white py-2.5 text-center">
                <span className="text-3xl font-black text-carbon-dark leading-none">
                  {wednesdayDayNum()}
                </span>
              </div>
              <div className="bg-carbon-light py-1 text-center">
                <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Miérc.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA: ver turnos */}
        <button
          onClick={() => setShowSchedule(true)}
          className="relative mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/12 text-white font-bold text-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <CalendarDays className="w-4 h-4 text-apple-green" strokeWidth={2.5} />
          Ver cuándo me toca
        </button>

        <div className="relative mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-semibold">
          <Clock className="w-3 h-3 text-apple-green" />
          <span>Rotación automática cada miércoles</span>
        </div>
      </div>

      {/* ── RECEIPT CARD: Pedido con fecha + desglose por persona ── */}
      <div className="animate-fade-up delay-100">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
            <span className="text-sm font-extrabold text-carbon-dark dark:text-white capitalize">
              Pedido del {wednesdayShort()}
            </span>
          </div>
          <span className="text-xs font-black text-apple-green bg-apple-green/10 px-2.5 py-1 rounded-full border border-apple-green/20">
            {grandTotal} bizcochos
          </span>
        </div>

        {activeTotals.length === 0 ? (
          <div className="bg-white dark:bg-carbon-gray rounded-3xl border border-gray-100 dark:border-white/10 p-8 text-center shadow-card">
            <Layers className="w-10 h-10 text-gray-200 dark:text-white/15 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-400">Sin pedidos aún</p>
            <p className="text-xs text-gray-300 dark:text-gray-500 mt-0.5">Editá las elecciones de los integrantes para ver el total.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-carbon-gray rounded-3xl border border-gray-100 dark:border-white/10 shadow-card overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-apple-green to-apple-green-hover absolute top-0 left-0 right-0" />
            <div className="divide-y divide-dashed divide-gray-100 dark:divide-white/10 pt-1">
              {activeTotals.map(({ type, count }) => {
                const isOpen = expandedType === type;
                const people = peopleFor(type);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between px-5 py-4 hover:bg-carbon-light/50 dark:hover:bg-white/5 transition-colors group">
                      <button
                        onClick={() => setExpandedType(isOpen ? null : type)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        title="Ver quién lo come"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0 group-hover:scale-150 transition-transform" />
                        <span className="text-sm font-semibold text-carbon-dark dark:text-white truncate">{type}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-apple-green' : ''}`}
                        />
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpandedType(isOpen ? null : type)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            isOpen
                              ? 'bg-apple-green/15 text-apple-green border-apple-green/25'
                              : 'bg-carbon-light dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:text-apple-green hover:border-apple-green/25'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {people.length}
                        </button>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-bold">×</span>
                        <span className="w-9 h-9 rounded-xl bg-carbon-light dark:bg-white/5 text-carbon-dark dark:text-white font-extrabold text-sm flex items-center justify-center border border-gray-100 dark:border-white/10 shadow-sm">
                          {count}
                        </span>
                      </div>
                    </div>

                    {/* People breakdown */}
                    {isOpen && (
                      <div className="px-5 pb-4 -mt-1 animate-scale-up">
                        <div className="flex flex-wrap gap-1.5 pl-4">
                          {people.map(p => (
                            <span
                              key={p.name}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 text-[11px] font-bold text-carbon-dark dark:text-white"
                            >
                              {p.name}
                              <span className="w-4 h-4 rounded-md bg-apple-green/15 text-apple-green text-[9px] font-black flex items-center justify-center">
                                {p.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Receipt total footer */}
              <div className="px-5 py-4 flex items-center justify-between bg-carbon-light/40 dark:bg-white/5">
                <span className="text-xs font-extrabold text-carbon-dark dark:text-white uppercase tracking-wider">Total</span>
                <span className="text-base font-black text-apple-green">{grandTotal} unidades</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Last Visit Footer ── */}
      {lastReviewer && (
        <div className="flex items-center gap-2 px-2 animate-fade-up delay-200">
          <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0" />
          <p className="text-[10px] text-gray-400 font-semibold">
            Última visita: <span className="font-bold text-gray-500 dark:text-gray-400">{lastReviewer}</span>
            {lastReviewTimestamp && (
              <span className="text-gray-400 dark:text-gray-500"> · {formatTime(lastReviewTimestamp)}</span>
            )}
          </p>
        </div>
      )}

      {/* ── SCHEDULE MODAL: ¿Cuándo me toca? ── */}
      {showSchedule && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setShowSchedule(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-carbon-gray rounded-t-3xl shadow-2xl max-w-2xl w-full mx-auto animate-slide-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/15" />
            </div>

            <div className="px-6 pt-3 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
                <span className="text-base font-extrabold text-carbon-dark dark:text-white">¿Cuándo me toca?</span>
              </div>
              <button
                onClick={() => setShowSchedule(false)}
                className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-carbon-dark dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                {buyerQueue.map((id, index) => {
                  const user = users.find(u => u.id === id);
                  if (!user) return null;
                  const isCurrent = index === 0;
                  const isYou = id === currentUser;
                  return (
                    <div
                      key={id}
                      className={`flex items-center justify-between gap-3 px-3 py-3 rounded-2xl border transition-colors ${
                        isCurrent
                          ? 'bg-apple-green/10 border-apple-green/25'
                          : 'bg-carbon-light/60 dark:bg-white/5 border-gray-100 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                          isCurrent ? 'bg-apple-green text-carbon-dark shadow-green' : 'bg-white dark:bg-white/10 text-gray-400 border border-gray-100 dark:border-white/10'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-carbon-dark dark:text-white truncate">{user.name}</span>
                            {isYou && (
                              <span className="text-[8px] font-black bg-apple-green/20 text-apple-green px-1.5 py-0.5 rounded-md uppercase tracking-wide">Vos</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-semibold capitalize">{wednesdayFull(index)}</span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] font-black text-apple-green uppercase tracking-wider flex-shrink-0">Ahora</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pt-2 pb-6 border-t border-gray-100 dark:border-white/10 flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold">
              <Clock className="w-3 h-3 text-apple-green" />
              <span>Cada miércoles el turno pasa al siguiente automáticamente.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
