import React, { useState } from 'react';
import type { User, BizcochoSelections, BizcochoType } from '../types';
import { BIZCOCHO_TYPES } from '../types';
import { createEmptySelections } from '../services/db';
import {
  UserPlus,
  Trash2,
  Edit3,
  Plus,
  Minus,
  Check,
  X,
  Users,
  AlertCircle,
  Eye,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-react';

interface MembersProps {
  users: User[];
  onAddUser: (name: string, selections: BizcochoSelections) => void;
  onUpdateUserSelections: (userId: string, selections: BizcochoSelections) => void;
  onDeleteUser: (userId: string) => void;
}

const avatarColors = [
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-red-500',
  'from-blue-400 to-indigo-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
];

export const Members: React.FC<MembersProps> = ({
  users,
  onAddUser,
  onUpdateUserSelections,
  onDeleteUser,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSel, setNewSel] = useState<BizcochoSelections>(() => createEmptySelections());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempSel, setTempSel] = useState<BizcochoSelections | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sumOf = (sel: BizcochoSelections) => Object.values(sel).reduce((s, v) => s + v, 0);

  // ── New member helpers ──
  const newTotal = sumOf(newSel);
  const incNew = (t: BizcochoType) => { if (newTotal < 4) setNewSel(p => ({ ...p, [t]: p[t] + 1 })); };
  const decNew = (t: BizcochoType) => { if (newSel[t] > 0) setNewSel(p => ({ ...p, [t]: p[t] - 1 })); };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || newTotal !== 4) return;
    onAddUser(newMemberName, newSel);
    setNewMemberName('');
    setNewSel(createEmptySelections());
    setShowAddForm(false);
  };

  // ── Edit helpers ──
  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setTempSel({ ...user.selections });
  };
  const cancelEdit = () => { setEditingUserId(null); setTempSel(null); };
  const saveEdit = (userId: string) => {
    if (!tempSel || sumOf(tempSel) !== 4) return;
    onUpdateUserSelections(userId, tempSel);
    cancelEdit();
  };
  const tempTotal = tempSel ? sumOf(tempSel) : 0;
  const incTemp = (t: BizcochoType) => { if (tempSel && tempTotal < 4) setTempSel(p => ({ ...p!, [t]: p![t] + 1 })); };
  const decTemp = (t: BizcochoType) => { if (tempSel && tempSel[t] > 0) setTempSel(p => ({ ...p!, [t]: p![t] - 1 })); };

  // Stepper row component
  const StepperRow = ({
    type, count, onInc, onDec, canInc
  }: { type: BizcochoType; count: number; onInc: () => void; onDec: () => void; canInc: boolean }) => (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0" />}
        {count === 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/15 flex-shrink-0" />}
        <span className={`text-xs font-semibold truncate ${count > 0 ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
          {type}
        </span>
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={onDec}
          disabled={count <= 0}
          className="w-7 h-7 rounded-lg bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:border-gray-200 transition-all active:scale-95 disabled:opacity-25 cursor-pointer"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className={`w-5 text-center text-sm font-extrabold ${count > 0 ? 'text-carbon-dark dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
          {count}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={!canInc}
          className="w-7 h-7 rounded-lg bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:border-gray-200 transition-all active:scale-95 disabled:opacity-25 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
            <span className="text-sm font-extrabold text-carbon-dark dark:text-white">Integrantes</span>
            <span className="w-5 h-5 rounded-lg bg-carbon-light dark:bg-white/5 text-gray-500 dark:text-gray-300 text-[10px] font-bold flex items-center justify-center border border-gray-100 dark:border-white/10">
              {users.length}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">Elecciones y estadísticas del grupo</p>
        </div>

        <button
          id="btn-toggle-add-member"
          onClick={() => { setShowAddForm(!showAddForm); setNewSel(createEmptySelections()); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-extrabold text-xs cursor-pointer transition-all duration-200 shadow-sm ${
            showAddForm
              ? 'bg-carbon-light dark:bg-white/5 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-white/10'
              : 'bg-apple-green text-carbon-dark hover:bg-apple-green-hover active:scale-95 shadow-green'
          }`}
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {showAddForm ? 'Cancelar' : 'Agregar'}
        </button>
      </div>

      {/* ── Add Member Form ── */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white dark:bg-carbon-gray rounded-3xl border border-gray-100 dark:border-white/10 shadow-card p-5 space-y-5 animate-scale-up"
        >
          <div>
            <p className="text-xs font-extrabold text-carbon-dark dark:text-white uppercase tracking-wider mb-3">Nuevo Integrante</p>
            <input
              type="text"
              required
              id="input-new-member-name"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              placeholder="Nombre del nuevo integrante…"
              className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-carbon-light dark:bg-white/5 py-3.5 px-4 text-sm font-semibold focus:border-apple-green focus:outline-none focus:ring-2 focus:ring-apple-green/15 placeholder-gray-300 dark:placeholder-gray-600 text-carbon-dark dark:text-white transition-all"
            />
          </div>

          {/* Pastry picker */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-carbon-dark dark:text-white">Elegí sus 4 bizcochos:</span>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full transition-colors ${
                newTotal === 4
                  ? 'bg-apple-green/10 text-apple-green border border-apple-green/20'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-400'
              }`}>
                {newTotal} / 4
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 px-4 py-1">
              {BIZCOCHO_TYPES.map(type => (
                <StepperRow
                  key={type}
                  type={type}
                  count={newSel[type]}
                  onInc={() => incNew(type)}
                  onDec={() => decNew(type)}
                  canInc={newTotal < 4}
                />
              ))}
            </div>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-gray-400 dark:text-amber-300/80 font-semibold bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2">
            ⓘ El nuevo integrante entrará como 2° en la cola — no paga el próximo miércoles.
          </p>

          <button
            type="submit"
            id="btn-submit-new-member"
            disabled={!newMemberName.trim() || newTotal !== 4}
            className="w-full py-3.5 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-2xl transition-all shadow-sm text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Agregar Integrante
          </button>
        </form>
      )}

      {/* ── Member Cards ── */}
      {users.length === 0 ? (
        <div className="bg-white dark:bg-carbon-gray rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
          <Users className="w-12 h-12 text-gray-200 dark:text-white/15 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">Sin integrantes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user, userIndex) => {
            const isEditing = editingUserId === user.id;
            const currentTotal = sumOf(user.selections);
            const isMissing = currentTotal === 0;
            const activeSel = BIZCOCHO_TYPES
              .filter(t => user.selections[t] > 0)
              .map(t => ({ type: t, count: user.selections[t] }));
            const colorClass = avatarColors[userIndex % avatarColors.length];

            return (
              <div
                key={user.id}
                id={`member-card-${user.id}`}
                className={`bg-white dark:bg-carbon-gray rounded-3xl border shadow-card transition-all duration-300 overflow-hidden ${
                  isEditing
                    ? 'border-apple-green ring-2 ring-apple-green/10'
                    : isMissing
                      ? 'border-amber-200 dark:border-amber-500/30'
                      : 'border-gray-100 dark:border-white/10'
                }`}
              >
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    {/* Gradient avatar */}
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-extrabold text-base shadow-sm flex-shrink-0`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-carbon-dark dark:text-white text-base leading-tight">{user.name}</span>
                        {isMissing && (
                          <span className="text-[9px] font-extrabold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">
                            SIN ELEGIR
                          </span>
                        )}
                      </div>
                      {/* Stats pills */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-carbon-light dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-100 dark:border-white/10">
                          <Eye className="w-3 h-3 text-apple-green" />
                          <span>{user.ingresosCount ?? 0} visitas</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-carbon-light dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-100 dark:border-white/10">
                          <ShoppingBag className="w-3 h-3 text-apple-green" />
                          <span>{user.comprasCount ?? 0} compras</span>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          id={`btn-edit-member-${user.id}`}
                          onClick={() => startEdit(user)}
                          className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 hover:bg-apple-green/10 hover:border-apple-green/20 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-apple-green flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {deleteConfirmId === user.id ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20 p-1 animate-scale-up">
                            <button
                              id={`btn-confirm-delete-${user.id}`}
                              onClick={() => onDeleteUser(user.id)}
                              className="px-2.5 py-1 bg-red-500 text-white font-extrabold rounded-lg text-[10px] hover:bg-red-600 transition-colors cursor-pointer"
                            >Sí</button>
                            <button
                              id={`btn-cancel-delete-${user.id}`}
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                            ><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button
                            id={`btn-delete-member-${user.id}`}
                            onClick={() => setDeleteConfirmId(user.id)}
                            className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-100 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Missing warning */}
                  {isMissing && !isEditing && (
                    <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-3 py-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 leading-snug">
                        Falta que {user.name} indique cuáles bizcochos prefiere. Tocá el lápiz para editarlos.
                      </p>
                    </div>
                  )}
                </div>

                {/* Selections view */}
                {!isEditing && activeSel.length > 0 && (
                  <div className="px-5 pb-5">
                    <div className="flex flex-wrap gap-1.5">
                      {activeSel.map(({ type, count }) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 text-[11px] font-bold text-carbon-dark dark:text-white"
                        >
                          <span className="w-4 h-4 rounded-md bg-apple-green/15 text-apple-green text-[9px] font-black flex items-center justify-center border border-apple-green/15">
                            {count}
                          </span>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDITING STATE */}
                {isEditing && tempSel && (
                  <div className="border-t border-gray-100 dark:border-white/10 px-5 py-4 space-y-4 animate-scale-up bg-carbon-light/30 dark:bg-white/5">
                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-apple-green rounded-full transition-all duration-400"
                          style={{ width: `${(tempTotal / 4) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-extrabold ${tempTotal === 4 ? 'text-apple-green' : 'text-gray-400'}`}>
                        {tempTotal}/4
                      </span>
                    </div>

                    {/* Steppers */}
                    <div className="bg-white dark:bg-carbon-mid rounded-2xl border border-gray-100 dark:border-white/10 px-4 py-1 max-h-52 overflow-y-auto">
                      {BIZCOCHO_TYPES.map(type => (
                        <StepperRow
                          key={type}
                          type={type}
                          count={tempSel[type]}
                          onInc={() => incTemp(type)}
                          onDec={() => decTemp(type)}
                          canInc={tempTotal < 4}
                        />
                      ))}
                    </div>

                    {/* Validation */}
                    {tempTotal !== 4 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Asigná {4 - tempTotal} bizcocho{4 - tempTotal !== 1 ? 's' : ''} más para guardar.</span>
                      </div>
                    )}

                    {/* Save / Cancel */}
                    <div className="flex gap-2">
                      <button
                        id={`btn-save-member-${user.id}`}
                        onClick={() => saveEdit(user.id)}
                        disabled={tempTotal !== 4}
                        className="flex-1 py-3 bg-apple-green hover:bg-apple-green-hover disabled:opacity-40 disabled:cursor-not-allowed text-carbon-dark font-extrabold rounded-2xl transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Guardar
                      </button>
                      <button
                        id={`btn-cancel-member-${user.id}`}
                        onClick={cancelEdit}
                        className="px-5 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold rounded-2xl transition-all text-sm cursor-pointer hover:bg-carbon-light dark:hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Members;
