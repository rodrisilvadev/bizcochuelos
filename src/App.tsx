import { useState, useEffect, useRef } from 'react';
import {
  getAppState,
  checkAndRotateWednesday,
  dbRecordUserVisit,
  dbAddUser,
  dbUpdateUserSelections,
  dbDeleteUser,
  loadFromCloud,
  saveAppState,
} from './services/db';
import type { AppState, BizcochoSelections, BizcochoType } from './types';
import { BIZCOCHO_TYPES } from './types';
import { Dashboard } from './components/Dashboard';
import { Members } from './components/Members';
import { LoginModal } from './components/LoginModal';
import { Coffee, LayoutDashboard, Users, ShoppingBag, X, Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

function App() {
  const [state, setState] = useState<AppState>(() => getAppState());
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members'>('dashboard');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bizcochuelos_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Aplicar el tema a <html> y persistirlo.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bizcochuelos_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  // Marca el instante del último cambio local, para que el polling no pise
  // una edición recién guardada mientras la escritura viaja al servidor.
  const lastLocalWriteRef = useRef(0);
  const markLocalWrite = () => { lastLocalWriteRef.current = Date.now(); };

  // Al montar: rotar miércoles y traer el último estado compartido.
  useEffect(() => {
    setState(prev => checkAndRotateWednesday({ ...prev }));

    loadFromCloud().then(cloudState => {
      if (cloudState) {
        const rotated = checkAndRotateWednesday({ ...cloudState });
        setState(rotated);
        saveAppState(rotated);
      }
    });
  }, []);

  // Tiempo real: refrescar el estado compartido cada 15 s.
  useEffect(() => {
    const id = setInterval(async () => {
      // No pisar un cambio local reciente (ventana de 6 s para el round-trip).
      if (Date.now() - lastLocalWriteRef.current < 6000) return;
      const cloudState = await loadFromCloud();
      if (cloudState) setState(checkAndRotateWednesday({ ...cloudState }));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const handleSelectUser = (userId: string) => {
    markLocalWrite();
    const newState = dbRecordUserVisit(userId);
    setState(newState);
    setCurrentUser(userId);
  };

  const handleLogout = () => setCurrentUser(null);

  const handleAddUser = (name: string, selections: BizcochoSelections) => {
    markLocalWrite();
    setState(dbAddUser(name, selections));
  };

  const handleUpdateUserSelections = (userId: string, selections: BizcochoSelections) => {
    markLocalWrite();
    setState(dbUpdateUserSelections(userId, selections));
  };

  const handleDeleteUser = (userId: string) => {
    markLocalWrite();
    setState(dbDeleteUser(userId));
    if (currentUser === userId) setCurrentUser(null);
  };

  const activeUserObj = state.users.find(u => u.id === currentUser);

  // Compute order totals for the FAB modal
  const totals = BIZCOCHO_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<BizcochoType, number>);

  state.users.forEach(user => {
    BIZCOCHO_TYPES.forEach(type => {
      totals[type] += user.selections[type] || 0;
    });
  });

  const activeTotals = BIZCOCHO_TYPES
    .filter(type => totals[type] > 0)
    .map(type => ({ type, count: totals[type] }))
    .sort((a, b) => b.count - a.count);

  const grandTotal = activeTotals.reduce((s, { count }) => s + count, 0);

  const currentBuyer = state.users.find(u => u.id === state.buyerQueue[0]);

  return (
    <div className="min-h-screen bg-carbon-light dark:bg-[#0b0b0c] flex flex-col font-sans selection:bg-apple-green/20 selection:text-carbon-dark">

      {/* LOGIN MODAL */}
      {currentUser === null && (
        <LoginModal users={state.users} onSelectUser={handleSelectUser} />
      )}

      {/* ORDER MODAL — lista para la panadería */}
      {showOrderModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setShowOrderModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative bg-white dark:bg-carbon-gray rounded-t-3xl shadow-2xl max-w-2xl w-full mx-auto animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/15" />
            </div>

            {/* Header */}
            <div className="px-6 pt-3 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4.5 h-4.5 text-apple-green" strokeWidth={2.5} />
                  <span className="text-base font-extrabold text-carbon-dark dark:text-white">Lista para la Panadería</span>
                </div>
                {currentBuyer && (
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5 ml-6">
                    Compra: <span className="font-bold text-carbon-dark dark:text-white">{currentBuyer.name}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="w-8 h-8 rounded-xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-carbon-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {activeTotals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 font-semibold">Sin pedidos aún.</p>
              ) : (
                <div className="space-y-2">
                  {activeTotals.map(({ type, count }) => (
                    <div
                      key={type}
                      className="flex items-center justify-between py-3 px-4 rounded-2xl bg-carbon-light dark:bg-white/5 border border-gray-100 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-apple-green flex-shrink-0" />
                        <span className="text-sm font-semibold text-carbon-dark dark:text-white">{type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-bold">×</span>
                        <span className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 text-carbon-dark dark:text-white font-extrabold text-sm flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-sm">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer total */}
            <div className="px-6 pt-2 pb-6 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-extrabold text-carbon-dark dark:text-white uppercase tracking-wider">Total</span>
              <span className="text-lg font-black text-apple-green">{grandTotal} bizcochos</span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 glassmorphism border-b border-white/60 shadow-glass">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-apple-green flex items-center justify-center shadow-sm animate-float">
              <Coffee className="w-4 h-4 text-carbon-dark" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-carbon-dark dark:text-white tracking-tight leading-none">Bizcochuelos</h1>
              <p className="text-[10px] text-gray-400 font-semibold leading-none mt-0.5">Oficina · Bizcochos Semanales</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle claro / oscuro */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-carbon-light dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-carbon-dark dark:hover:text-white hover:border-gray-200 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {activeUserObj && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 cursor-pointer group"
                title="Cerrar sesión"
              >
                <div className="w-7 h-7 rounded-full bg-apple-green/15 border border-apple-green/30 text-apple-green flex items-center justify-center font-extrabold text-xs group-hover:bg-apple-green group-hover:text-carbon-dark transition-all duration-200 animate-pulse-green">
                  {activeUserObj.name.charAt(0).toUpperCase()}
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-5 pb-28">
        {activeTab === 'dashboard'
          ? <Dashboard state={state} currentUser={currentUser} />
          : <Members
              users={state.users}
              onAddUser={handleAddUser}
              onUpdateUserSelections={handleUpdateUserSelections}
              onDeleteUser={handleDeleteUser}
            />
        }
      </main>

      {/* FAB — sticky "Lista Panadería" (mismo estilo glass-hero que la card del turno) */}
      <button
        onClick={() => setShowOrderModal(true)}
        className="glass-hero fixed right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl text-white font-extrabold text-xs shadow-lifted hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
        title="Ver lista completa para la panadería"
      >
        <ShoppingBag className="w-4 h-4 text-apple-green" strokeWidth={2.5} />
        <span>{grandTotal} bizcochos</span>
      </button>

      {/* BOTTOM TAB BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glassmorphism border-t border-white/60 shadow-glass">
        <div className="max-w-2xl mx-auto px-6 py-2 flex items-center justify-around">
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`relative flex flex-col items-center gap-1 px-6 py-1.5 rounded-xl transition-all duration-250 cursor-pointer ${
              activeTab === 'dashboard' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'
            }`}
          >
            {activeTab === 'dashboard' && (
              <div className="absolute -inset-1 bg-apple-green/10 rounded-xl" />
            )}
            <LayoutDashboard className={`w-5 h-5 relative z-10 transition-transform duration-250 ${activeTab === 'dashboard' ? 'text-carbon-dark dark:text-white scale-110' : ''}`} strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.8} />
            <span className={`text-[10px] font-bold relative z-10 ${activeTab === 'dashboard' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
              Compra
            </span>
            {activeTab === 'dashboard' && <div className="nav-active-indicator" />}
          </button>

          <button
            id="tab-btn-members"
            onClick={() => setActiveTab('members')}
            className={`relative flex flex-col items-center gap-1 px-6 py-1.5 rounded-xl transition-all duration-250 cursor-pointer ${
              activeTab === 'members' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'
            }`}
          >
            {activeTab === 'members' && (
              <div className="absolute -inset-1 bg-apple-green/10 rounded-xl" />
            )}
            <Users className={`w-5 h-5 relative z-10 transition-transform duration-250 ${activeTab === 'members' ? 'text-carbon-dark dark:text-white scale-110' : ''}`} strokeWidth={activeTab === 'members' ? 2.5 : 1.8} />
            <span className={`text-[10px] font-bold relative z-10 ${activeTab === 'members' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
              Integrantes
            </span>
            {activeTab === 'members' && <div className="nav-active-indicator" />}
          </button>
        </div>
        <div className="h-safe-area-inset-bottom bg-transparent" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </div>
  );
}

export default App;
