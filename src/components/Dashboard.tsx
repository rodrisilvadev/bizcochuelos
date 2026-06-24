import React from 'react';
import type { AppState, BizcochoType } from '../types';
import { BIZCOCHO_TYPES } from '../types';
import {
  ShoppingBag,
  ArrowRight,
  Layers,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  currentUser: string | null;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, currentUser, onLogout }) => {
  const { users, buyerQueue, lastReviewer, lastReviewTimestamp } = state;

  const activeUserObj = users.find(u => u.id === currentUser);
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

  // Wednesday date helpers
  const getUpcomingWednesday = (offsetWeeks = 0): Date => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun … 6=Sat
    let daysToWed = (3 - day + 7) % 7;
    // If it IS Wednesday but past noon, treat as "next" Wednesday
    if (daysToWed === 0 && day === 3 && d.getHours() >= 13) daysToWed = 7;
    d.setDate(d.getDate() + daysToWed + offsetWeeks * 7);
    return d;
  };

  const wednesdayDate = (offsetWeeks = 0): string => {
    const d = getUpcomingWednesday(offsetWeeks);
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const wednesdayDayNum = (offsetWeeks = 0): string =>
    String(getUpcomingWednesday(offsetWeeks).getDate());

  const wednesdayMonthLabel = (offsetWeeks = 0): string =>
    getUpcomingWednesday(offsetWeeks)
      .toLocaleDateString('es-AR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();

  const formatTime = (iso: string | null): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  // Queue offset for label
  const queueLabel = (index: number): string => {
    if (index === 0) return wednesdayDate(0);
    if (index === 1) return wednesdayDate(1);
    return wednesdayDate(index);
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HERO CARD: Quién compra ── */}
      <div className="noise-overlay relative overflow-hidden rounded-3xl bg-gradient-to-br from-carbon-dark via-[#1c1c1c] to-carbon-gray text-white shadow-lifted border border-white/5 p-6 animate-fade-up">
        {/* Abstract green glow blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-apple-green/10 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/4 blur-[60px] pointer-events-none" />

        {/* Top row */}
        <div className="relative flex items-start justify-between gap-4">
          {/* Info */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-apple-green/15 border border-apple-green/25 text-apple-green text-[10px] font-extrabold tracking-widest uppercase">
              <Sparkles className="w-3 h-3" />
              Turno Activo
            </div>

            <div>
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Le toca comprar:
              </p>
              <p className="text-3xl font-extrabold text-white tracking-tight truncate">
                {currentBuyer?.name ?? 'Sin asignar'}
              </p>
            </div>

            {nextBuyer && (
              <div className="flex items-center gap-1.5 glassmorphism-dark rounded-xl px-3 py-2 w-fit border border-white/8">
                <span className="text-[10px] text-gray-400 font-bold">Siguiente:</span>
                <span className="text-xs text-apple-green font-extrabold flex items-center gap-1">
                  {nextBuyer.name}
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>

          {/* Calendar widget */}
          <div className="flex-shrink-0">
            <div className="w-[72px] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10">
              {/* Month strip */}
              <div className="bg-carbon-mid py-1 text-center">
                <span className="text-[9px] font-extrabold text-apple-green tracking-widest">
                  {wednesdayMonthLabel()}
                </span>
              </div>
              {/* Day number */}
              <div className="bg-white py-2.5 text-center">
                <span className="text-3xl font-black text-carbon-dark leading-none">
                  {wednesdayDayNum()}
                </span>
              </div>
              {/* Weekday */}
              <div className="bg-carbon-light py-1 text-center">
                <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider">
                  Miérc.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative mt-5 pt-4 border-t border-white/8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
            <Clock className="w-3 h-3 text-apple-green" />
            <span>Rotación automática cada miércoles</span>
          </div>
          {activeUserObj && (
            <button
              onClick={onLogout}
              className="text-[10px] text-gray-500 font-bold underline underline-offset-2 cursor-pointer hover:text-apple-green transition-colors"
            >
              Cambiar usuario
            </button>
          )}
        </div>
      </div>

      {/* ── QUEUE CARD: Cola de compradores ── */}
      <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden animate-fade-up delay-100">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
            <span className="text-sm font-extrabold text-carbon-dark">Cola de Compradores</span>
          </div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{buyerQueue.length} turnos</span>
        </div>

        <div className="divide-y divide-gray-50">
          {buyerQueue.slice(0, 5).map((id, index) => {
            const user = users.find(u => u.id === id);
            if (!user) return null;

            const isCurrent = index === 0;

            return (
              <div
                key={id}
                className={`px-5 py-3.5 flex items-center justify-between gap-3 transition-colors duration-150 ${isCurrent ? 'bg-apple-green/5' : 'hover:bg-carbon-light/60'}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                    isCurrent
                      ? 'bg-apple-green text-carbon-dark shadow-green'
                      : 'bg-carbon-light text-gray-400'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Name */}
                  <span className={`text-sm truncate ${isCurrent ? 'font-extrabold text-carbon-dark' : 'font-semibold text-carbon-dark'}`}>
                    {user.name}
                  </span>


                </div>

                {/* Date */}
                <span className={`text-[10px] font-bold flex-shrink-0 capitalize ${isCurrent ? 'text-apple-green' : 'text-gray-400'}`}>
                  {queueLabel(index)}
                </span>
              </div>
            );
          })}

          {buyerQueue.length > 5 && (
            <div className="px-5 py-3 flex items-center justify-center gap-1 text-[11px] text-gray-400 font-bold">
              <span>+{buyerQueue.length - 5} más en cola</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* ── RECEIPT CARD: Lista de Pedido ── */}
      <div className="animate-fade-up delay-200">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
            <span className="text-sm font-extrabold text-carbon-dark">Pedido del Miércoles</span>
          </div>
          <span className="text-xs font-black text-apple-green bg-apple-green/10 px-2.5 py-1 rounded-full border border-apple-green/20">
            {grandTotal} bizcochos
          </span>
        </div>

        {activeTotals.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-card">
            <Layers className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-400">Sin pedidos aún</p>
            <p className="text-xs text-gray-300 mt-0.5">Editá las elecciones de los integrantes para ver el total.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden relative">
            {/* Green top stripe */}
            <div className="h-1 bg-gradient-to-r from-apple-green to-apple-green-hover absolute top-0 left-0 right-0" />
            {/* Items */}
            <div className="divide-y divide-dashed divide-gray-100 pt-1">
              {activeTotals.map(({ type, count }, i) => (
                <div
                  key={type}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-carbon-light/50 transition-colors group animate-fade-in delay-${Math.min(i * 50, 300)}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0 group-hover:scale-150 transition-transform" />
                    <span className="text-sm font-semibold text-carbon-dark truncate">{type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-gray-300 font-bold">×</span>
                    <span className="w-9 h-9 rounded-xl bg-carbon-light text-carbon-dark font-extrabold text-sm flex items-center justify-center border border-gray-100 group-hover:border-apple-green/25 group-hover:bg-white transition-all shadow-sm">
                      {count}
                    </span>
                  </div>
                </div>
              ))}

              {/* Receipt total footer */}
              <div className="px-5 py-4 flex items-center justify-between bg-carbon-light/40">
                <span className="text-xs font-extrabold text-carbon-dark uppercase tracking-wider">Total</span>
                <span className="text-base font-black text-apple-green">{grandTotal} unidades</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Last Visit Footer ── */}
      {lastReviewer && (
        <div className="flex items-center gap-2 px-2 animate-fade-up delay-300">
          <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0" />
          <p className="text-[10px] text-gray-400 font-semibold">
            Última visita: <span className="font-bold text-gray-500">{lastReviewer}</span>
            {lastReviewTimestamp && (
              <span className="text-gray-400"> · {formatTime(lastReviewTimestamp)}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
