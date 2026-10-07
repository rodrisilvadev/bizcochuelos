import { useState, useEffect, useRef } from 'react';
import {
  getPlaceholderState,
  checkAndRotateWednesday,
  applyCemeteryMigration,
  applyCatalogMigration,
  dbRecordUserVisit,
  dbAddUser,
  dbUpdateUserSelections,
  dbDeleteUser,
  dbCompleteOnboarding,
  dbReorderQueue,
  dbAddCatalogItem,
  dbUpdateCatalogItem,
  dbRemoveCatalogItem,
  dbSetPresupuesto,
  dbSetAdminPin,
  pullFromCloud,
  persistDerivedState,
  seedCloudIfEmpty,
  cacheStateLocally,
  notifyCloudReadProblem,
  SyncError,
} from './services/db';
import { isAdminUser, isUnlocked, setUnlocked } from './services/admin';
import type { AppState, BizcochoSelections, BizcochoType } from './types';
import { Dashboard } from './components/Dashboard';
import { Members } from './components/Members';
import { LoginModal } from './components/LoginModal';
import { WelcomeModal } from './components/WelcomeModal';
import { RulesModal } from './components/RulesModal';
import { History } from './components/History';
import { Cemetery } from './components/Cemetery';
import { AdminPanel } from './components/AdminPanel';
import { PinModal } from './components/PinModal';
import { SyncErrorToasts } from './components/SyncErrorToasts';
import { Coffee, LayoutDashboard, Users, ShoppingBag, X, Sun, Moon, ScrollText, ShieldCheck, History as HistoryIcon } from 'lucide-react';
import { TombstoneIcon } from './components/TombstoneIcon';

type Theme = 'light' | 'dark';
const CURRENT_USER_KEY = 'bizcochuelos_current_user';

function App() {
  // Primer render: la última copia conocida de la nube (o la semilla si este
  // dispositivo nunca vio nada). Es solo para no mostrar una pantalla vacía —
  // no se rota, no se migra y no se sube. Rotarla era justamente lo que
  // fabricaba un historial falso a partir de la semilla.
  const [state, setState] = useState<AppState>(() => getPlaceholderState());
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem(CURRENT_USER_KEY));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'history' | 'cemetery'>('dashboard');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  // Qué hacer una vez que se pase el PIN. Guardar la intención evita el paso
  // extra de "desbloqueaste, ahora volvé a tocar el botón".
  const [pinIntent, setPinIntent] = useState<'panel' | 'reorder' | 'change' | null>(null);
  const [unlocked, setUnlockedState] = useState<boolean>(() => isUnlocked());
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

  // Toma el estado que vino de la nube, le aplica migraciones y rotación de
  // miércoles, lo muestra, y persiste SOLO si algo cambió de verdad.
  //
  // Todo esto corre únicamente sobre datos recién traídos del servidor. Nunca
  // sobre la copia local: una copia local vieja rotada y subida borraría los
  // cambios de todos los demás.
  const adoptCloudState = async (cloudState: AppState, degraded = false) => {
    // Sin cortocircuito — las dos migraciones tienen que correr siempre, no
    // solo hasta que una devuelva true.
    const cemeteryMigrated = applyCemeteryMigration(cloudState);
    const catalogMigrated = applyCatalogMigration(cloudState);
    const migrated = cemeteryMigrated || catalogMigrated;
    const rotated = checkAndRotateWednesday(cloudState);
    const changed = migrated || rotated.lastProcessedWednesday !== cloudState.lastProcessedWednesday;

    if (!changed) {
      setState(cloudState);
      cacheStateLocally(cloudState);
      return;
    }

    // Backend en modo solo lectura: no se intenta guardar (fallaría) pero SÍ se
    // muestra el estado rotado. La rotación se calcula en el cliente, así que
    // mientras se pueda leer, en pantalla le toca a quien de verdad le toca; en
    // cuanto el token vuelva, el primer guardado lo deja asentado.
    if (degraded) {
      setState(rotated);
      return;
    }

    // Si otro dispositivo ganó la carrera y ya hizo la misma rotación, esto
    // devuelve null: su versión y la nuestra son equivalentes, y el próximo
    // refresco la trae. No hay nada que reintentar.
    const saved = await persistDerivedState(rotated);
    setState(saved ?? rotated);
    if (saved) cacheStateLocally(saved);
  };

  // Al montar: traer el estado compartido. Si la nube está vacía de verdad
  // (primer arranque del grupo), recién ahí se siembra.
  useEffect(() => {
    pullFromCloud().then(read => {
      if (!read.ok) {
        // Antes esto era un `return` pelado. Un backend caído quedaba
        // indistinguible de una app sana: se seguía mostrando la copia local
        // como si estuviera al día, y así la cola de turnos se atrasó una
        // semana sin que nadie viera nada raro.
        notifyCloudReadProblem(
          'No hay conexión con el servidor: lo que ves puede estar viejo, incluido de quién es el turno.'
        );
        return; // se queda con el placeholder; el refresco reintenta
      }
      if (read.degraded) {
        notifyCloudReadProblem(
          'El servidor está en modo solo lectura: los turnos se ven bien, pero nada que cambies se va a guardar.'
        );
      }
      if (read.state) return adoptCloudState(read.state, read.degraded);
      if (read.degraded) return; // sin token no se puede sembrar nada
      return seedCloudIfEmpty().then(seeded => {
        if (seeded) setState(seeded);
      });
    });
  }, []);

  // Si el usuario logueado (recordado en localStorage) fue borrado del
  // grupo, no lo dejamos "logueado" en el limbo.
  useEffect(() => {
    if (currentUser && state.users.length > 0 && !state.users.some(u => u.id === currentUser)) {
      setCurrentUser(null);
    }
  }, [currentUser, state.users]);

  // Tiempo real: refrescar el estado compartido cada 15 s.
  useEffect(() => {
    const id = setInterval(async () => {
      // No pisar en pantalla un cambio local que todavía está viajando.
      // (Que se pise no perdería datos — el guardado ya es atómico contra el
      // servidor — pero se vería un parpadeo al valor anterior.)
      if (Date.now() - lastLocalWriteRef.current < 6000) return;
      const read = await pullFromCloud();
      if (!read.ok) {
        notifyCloudReadProblem(
          'Se perdió la conexión con el servidor: lo que ves puede estar viejo, incluido de quién es el turno.'
        );
        return;
      }
      if (read.degraded) {
        notifyCloudReadProblem(
          'El servidor está en modo solo lectura: los turnos se ven bien, pero nada que cambies se va a guardar.'
        );
      }
      if (read.state) await adoptCloudState(read.state, read.degraded);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Una mutación que falla NO se aplica en pantalla: db.ts ya avisó con un
  // toast, y mostrar el cambio como hecho cuando el servidor lo rechazó es
  // exactamente lo que hacía creer que se había guardado algo que nadie más
  // iba a ver. Devuelve true solo si quedó guardado de verdad.
  const runMutation = async (op: () => Promise<AppState>): Promise<boolean> => {
    markLocalWrite();
    try {
      setState(await op());
      return true;
    } catch (err) {
      if (!(err instanceof SyncError)) throw err;
      // Volvemos a mostrar lo que realmente hay guardado, para que la pantalla
      // no quede con un valor que el servidor nunca aceptó.
      const read = await pullFromCloud();
      if (read.ok && read.state) setState(read.state);
      return false;
    }
  };

  const handleSelectUser = async (userId: string) => {
    // El login entra igual aunque no se pueda registrar la visita: quedarse
    // afuera por un contador sería peor que perder el contador.
    setCurrentUser(userId);
    localStorage.setItem(CURRENT_USER_KEY, userId);
    await runMutation(() => dbRecordUserVisit(userId));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const handleAddUser = (name: string) => runMutation(() => dbAddUser(name));

  const handleUpdateUserSelections = (userId: string, selections: BizcochoSelections) =>
    runMutation(() => dbUpdateUserSelections(userId, selections));

  const handleCompleteOnboarding = (userId: string, selections: BizcochoSelections) =>
    runMutation(() => dbCompleteOnboarding(userId, selections));

  const handleReorderQueue = (newQueue: string[]) => runMutation(() => dbReorderQueue(newQueue));

  // ── Administración ────────────────────────────────────────────────────────
  //
  // `isAdmin` decide a quién se le muestra la puerta; `unlocked`, quién ya
  // pasó. Ver services/admin.ts: la primera no es una protección, la segunda
  // sí (dentro de lo que da un PIN corto en una app sin servidor de auth).
  const isAdmin = isAdminUser(state, currentUser);
  const canAdmin = isAdmin && unlocked;

  const requestUnlock = (intent: 'panel' | 'reorder' | 'change') => setPinIntent(intent);

  const handlePinUnlocked = () => {
    const intent = pinIntent;
    setPinIntent(null);
    // Cambiar el PIN no debería dejar la sesión bloqueada, pero tampoco es lo
    // que abre la puerta: al terminar se vuelve al panel, que ya estaba abierto.
    setUnlocked(true);
    setUnlockedState(true);
    if (intent === 'panel') setShowAdminPanel(true);
  };

  const handleSetPin = (hash: string) => runMutation(() => dbSetAdminPin(hash));

  const handleAddCatalogItem = (name: string, precio: number) =>
    runMutation(() => dbAddCatalogItem(name, precio));
  const handleUpdateCatalogItem = (name: string, precio: number) =>
    runMutation(() => dbUpdateCatalogItem(name, precio));
  const handleRemoveCatalogItem = (name: string) =>
    runMutation(() => dbRemoveCatalogItem(name));
  const handleSetPresupuesto = (pesos: number) =>
    runMutation(() => dbSetPresupuesto(pesos));

  const handleDeleteUser = async (userId: string, reason: string) => {
    const ok = await runMutation(() => dbDeleteUser(userId, reason));
    if (ok && currentUser === userId) handleLogout();
  };

  const activeUserObj = state.users.find(u => u.id === currentUser);

  // Compute order totals for the FAB modal
  const totals = state.catalog.reduce((acc, item) => {
    acc[item.name] = 0;
    return acc;
  }, {} as Record<BizcochoType, number>);

  state.users.forEach(user => {
    state.catalog.forEach(({ name: type }) => {
      totals[type] += user.selections[type] || 0;
    });
  });

  const activeTotals = state.catalog
    .filter(item => totals[item.name] > 0)
    .map(item => ({ type: item.name, count: totals[item.name] }))
    .sort((a, b) => b.count - a.count);

  const grandTotal = activeTotals.reduce((s, { count }) => s + count, 0);

  // Lo que va a salir el pedido, para quien tenga que ir a la panadería.
  const grandPesos = state.catalog.reduce(
    (sum, item) => sum + item.precio * (totals[item.name] || 0), 0,
  );

  const currentBuyer = state.users.find(u => u.id === state.buyerQueue[0]);
  const onboarding = !!(activeUserObj && activeUserObj.needsOnboarding);

  return (
    <div className="min-h-screen bg-carbon-light dark:bg-[#0b0b0c] flex flex-col font-sans selection:bg-apple-green/20 selection:text-carbon-dark">

      <SyncErrorToasts />

      {/* LOGIN MODAL */}
      {currentUser === null && (
        <LoginModal users={state.users} onSelectUser={handleSelectUser} />
      )}

      {/* WELCOME MODAL — alta nueva eligiendo sus bizcochos por primera vez */}
      {activeUserObj && onboarding && (
        <WelcomeModal
          user={activeUserObj}
          state={state}
          onComplete={selections => handleCompleteOnboarding(activeUserObj.id, selections)}
        />
      )}

      {/* RULES MODAL — mandamientos bizcochísticos */}
      {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}

      {/* ADMIN — panel de catálogo y presupuesto, detrás del PIN */}
      {showAdminPanel && canAdmin && (
        <AdminPanel
          state={state}
          onAddItem={handleAddCatalogItem}
          onUpdateItem={handleUpdateCatalogItem}
          onRemoveItem={handleRemoveCatalogItem}
          onSetPresupuesto={handleSetPresupuesto}
          onChangePin={() => requestUnlock('change')}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* PIN — se abre cuando se intenta una acción bajo llave. Al cambiar el
          PIN se fuerza el modo "crear" pasando pinHash null. */}
      {pinIntent && (
        <PinModal
          pinHash={pinIntent === 'change' ? null : state.admin.pinHash}
          onUnlock={handlePinUnlocked}
          onCreate={handleSetPin}
          onClose={() => setPinIntent(null)}
        />
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
              <div className="text-right">
                <span className="block text-lg font-black text-apple-green leading-none">${grandPesos}</span>
                <span className="block text-[11px] font-bold text-gray-400 mt-1">{grandTotal} unidades</span>
              </div>
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
            {/* Panel de administración — solo se le muestra a quien figura en
                admin.userIds. No es la protección: esa es el PIN. */}
            {isAdmin && (
              <button
                id="btn-admin-panel"
                onClick={() => (canAdmin ? setShowAdminPanel(true) : requestUnlock('panel'))}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  canAdmin
                    ? 'bg-apple-green/15 border-apple-green/30 text-apple-green'
                    : 'bg-carbon-light dark:bg-white/10 border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:text-carbon-dark dark:hover:text-white'
                }`}
                title="Panel de administración"
                aria-label="Abrir el panel de administración"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            {/* Mandamientos bizcochísticos */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="w-8 h-8 rounded-full bg-carbon-light dark:bg-white/10 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-carbon-dark dark:hover:text-white hover:border-gray-200 transition-all cursor-pointer"
              title="Los Mandamientos Bizcochísticos"
              aria-label="Ver reglas del grupo"
            >
              <ScrollText className="w-4 h-4" />
            </button>

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
        {activeTab === 'dashboard' && (
          <Dashboard
            state={state}
            currentUser={currentUser}
            onReorderQueue={handleReorderQueue}
            isAdmin={isAdmin}
            canReorder={canAdmin}
            onRequestUnlock={() => requestUnlock('reorder')}
          />
        )}
        {activeTab === 'members' && (
          <Members
            state={state}
            users={state.users}
            onAddUser={handleAddUser}
            onUpdateUserSelections={handleUpdateUserSelections}
            onDeleteUser={handleDeleteUser}
          />
        )}
        {activeTab === 'history' && <History history={state.history} />}
        {activeTab === 'cemetery' && <Cemetery cemetery={state.cemetery} />}
      </main>

      {/* FAB — sticky "Lista Panadería" (mismo estilo glass-hero que la card del turno) */}
      {!onboarding && (
        <button
          onClick={() => setShowOrderModal(true)}
          className="glass-hero fixed right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl text-white font-extrabold text-xs shadow-lifted hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
          title="Ver lista completa para la panadería"
        >
          <ShoppingBag className="w-4 h-4 text-apple-green" strokeWidth={2.5} />
          <span>{grandTotal} bizcochos</span>
        </button>
      )}

      {/* BOTTOM TAB BAR */}
      {!onboarding && (
      <nav className="fixed bottom-0 left-0 right-0 z-40 glassmorphism border-t border-white/60 shadow-glass">
        {/* Las cuatro celdas son flex-1 basis-0, o sea exactamente 1/4 del ancho
            cada una. Con `justify-around` se repartían según el ancho natural de
            cada texto, y "Compra + Integrantes" no pesa lo mismo que "Historial +
            Cementerio", así que las pestañas quedaban desparejas. */}
        <div className="max-w-2xl mx-auto px-2 py-2 flex items-end">
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`relative flex-1 basis-0 min-w-0 flex flex-col items-center gap-1 px-0.5 py-1.5 rounded-xl transition-all duration-250 cursor-pointer ${
              activeTab === 'dashboard' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'
            }`}
          >
            {activeTab === 'dashboard' && (
              <div className="absolute inset-x-1 -inset-y-1 bg-apple-green/10 rounded-xl" />
            )}
            <LayoutDashboard className={`w-5 h-5 relative z-10 transition-transform duration-250 ${activeTab === 'dashboard' ? 'text-carbon-dark dark:text-white scale-110' : ''}`} strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.8} />
            <span className={`text-[10px] font-bold tracking-tight relative z-10 w-full text-center truncate ${activeTab === 'dashboard' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
              Compra
            </span>
            {activeTab === 'dashboard' && <div className="nav-active-indicator" />}
          </button>

          <button
            id="tab-btn-members"
            onClick={() => setActiveTab('members')}
            className={`relative flex-1 basis-0 min-w-0 flex flex-col items-center gap-1 px-0.5 py-1.5 rounded-xl transition-all duration-250 cursor-pointer ${
              activeTab === 'members' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'
            }`}
          >
            {activeTab === 'members' && (
              <div className="absolute inset-x-1 -inset-y-1 bg-apple-green/10 rounded-xl" />
            )}
            <Users className={`w-5 h-5 relative z-10 transition-transform duration-250 ${activeTab === 'members' ? 'text-carbon-dark dark:text-white scale-110' : ''}`} strokeWidth={activeTab === 'members' ? 2.5 : 1.8} />
            <span className={`text-[10px] font-bold tracking-tight relative z-10 w-full text-center truncate ${activeTab === 'members' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
              Integrantes
            </span>
            {activeTab === 'members' && <div className="nav-active-indicator" />}
          </button>

          <button
            id="tab-btn-history"
            onClick={() => setActiveTab('history')}
            className={`relative flex-1 basis-0 min-w-0 flex flex-col items-center gap-1 px-0.5 py-1.5 rounded-xl transition-all duration-250 cursor-pointer ${
              activeTab === 'history' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'
            }`}
          >
            {activeTab === 'history' && (
              <div className="absolute inset-x-1 -inset-y-1 bg-apple-green/10 rounded-xl" />
            )}
            <HistoryIcon className={`w-5 h-5 relative z-10 transition-transform duration-250 ${activeTab === 'history' ? 'text-carbon-dark dark:text-white scale-110' : ''}`} strokeWidth={activeTab === 'history' ? 2.5 : 1.8} />
            <span className={`text-[10px] font-bold tracking-tight relative z-10 w-full text-center truncate ${activeTab === 'history' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
              Historial
            </span>
            {activeTab === 'history' && <div className="nav-active-indicator" />}
          </button>

          <button
            id="tab-btn-cemetery"
            onClick={() => setActiveTab('cemetery')}
            className={`relative flex-1 basis-0 min-w-0 flex flex-col items-center gap-1 px-0.5 py-1.5 rounded-xl transition-all duration-250 cursor-pointer ${
              activeTab === 'cemetery' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'
            }`}
          >
            {activeTab === 'cemetery' && (
              <div className="absolute inset-x-1 -inset-y-1 bg-apple-green/10 rounded-xl" />
            )}
            <TombstoneIcon className={`w-4.5 h-5 relative z-10 transition-transform duration-250 ${activeTab === 'cemetery' ? 'text-carbon-dark dark:text-white scale-110' : ''}`} />
            <span className={`text-[10px] font-bold tracking-tight relative z-10 w-full text-center truncate ${activeTab === 'cemetery' ? 'text-carbon-dark dark:text-white' : 'text-gray-400'}`}>
              Cementerio
            </span>
            {activeTab === 'cemetery' && <div className="nav-active-indicator" />}
          </button>
        </div>
        <div className="h-safe-area-inset-bottom bg-transparent" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
      )}
    </div>
  );
}

export default App;
