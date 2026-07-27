# Bizcochuelos

App para gestionar la compra rotativa de bizcochos de la oficina, todos los miércoles.

## Qué hace

- **Turnos**: cada miércoles el turno pasa automáticamente a la siguiente persona en la cola (`buyerQueue`).
- **Elecciones**: cada integrante elige 4 bizcochos (de una lista fija de 12 tipos) que se usan para armar el pedido de la panadería.
- **Dashboard**: muestra quién compra esta semana, quién sigue, y el desglose del pedido total con quién come cada tipo.
- **Integrantes**: alta, baja y edición de las elecciones de cada persona.
- **Historial**: registro de los últimos pedidos (fecha, comprador, ítems) — se completa solo cada miércoles que pasa.
- **Reglas del grupo**: modal "Los Mandamientos Bizcochísticos", accesible desde el header.

## Los Mandamientos Bizcochísticos

1. **Alta de un integrante nuevo**: no compra en su primera vuelta. Entra, come, y recién desde el miércoles siguiente pasa a la cola de compra como cualquier otro integrante.
2. **Baja del grupo**: si alguien se quiere bajar, tiene que avisar con tiempo para reacomodar la cola y el pedido antes de que le toque comprar.
3. **Sustitución del producto**: el bizcocho es la base, no una obligación — se puede reemplazar por otro producto de contenido o costo similar (medialunas, sándwiches, etc.) sin drama.
4. **Cambio de turno**: si a alguien le toca comprar y no puede ese miércoles, coordina el cambio con otro integrante. La cola no se salta, se acomoda.

(Están escritas en el código en `src/components/RulesModal.tsx` — para editarlas, tocar ahí.)

## Onboarding de altas nuevas

Desde el rediseño de julio 2026, agregar un integrante en **Integrantes → Agregar** solo pide el nombre. No se le asignan bizcochos en ese momento.

La persona queda marcada con `needsOnboarding: true` y entra 2° en la cola (no paga la próxima, le toca la siguiente — cumple el Mandamiento 1). La primera vez que esa persona selecciona su nombre en el login, ve un modal de bienvenida (con confetti) y ahí elige sus 4 bizcochos; recién ahí puede navegar el resto de la app. Este flujo **no afecta a integrantes que ya existían** antes del cambio — solo aplica a altas nuevas.

## Balance de Levadura ("la verdad dura")

Mide si el reparto es justo, sin hablar de plata. La unidad es el **bizcocho**.

Contar turnos (`comprasCount`) sería injusto: un turno no vale siempre lo mismo, porque comprar cuando el grupo es de 8 cuesta el doble que cuando es de 4. El invariante correcto es *cada uno debería haber puesto tantos bizcochos como los que comió*:

```
puso_i    = Σ (total del pedido) sobre las semanas en que le tocó comprar
comió_i   = Σ (lo que comió esa semana) sobre las semanas en que estuvo
balance_i = puso_i − comió_i
```

**Σ balance_i = 0** sobre todo el que alguna vez participó. La semana que comprás tu neto es `(total − lo tuyo)`, positivo; el de cada otro es `(−lo suyo)`. Como `total` es la suma de lo que come el grupo, se cancela. Por eso el libro **incluye a los que están en el Cementerio**: sacarlos rompería el cero y repartiría su deuda entre los que quedan sin que se note.

Detalles que importan:

- **Se deriva del historial, no se acumula.** `checkAndRotateWednesday` corre en cada dispositivo, así que un contador acumulado podría sumar dos veces la misma semana y quedar mal para siempre sin forma de auditarlo. Derivarlo lo hace recalculable (`services/ledger.ts`).
- **Diente de sierra.** El balance salta para arriba el día que comprás y baja cada semana hasta que te vuelve a tocar. **Estar en negativo no es hacer trampa: es que se te viene el turno.** Lo que delata a alguien es irse del grupo en negativo — por eso el Cementerio muestra el balance final de cada baja.
- **El libro arranca el 2026-07-01**, la primera entrada del historial. Antes de esa fecha no hay registro de quién estaba ni de cuánto comía. La fecha se muestra en la interfaz a propósito.
- **Limitación conocida:** Fabri y Javier tienen cada uno una compra anterior a esa fecha (`comprasCount = 1` sin entrada en el historial). El libro no puede acreditarla porque no quedó registrado el tamaño de ese pedido, así que su balance exagera la deuda en aproximadamente un turno. La interfaz lo avisa explícitamente en su fila en vez de esconderlo.
- **La cola no se reordena sola.** El orden del balance es *sugerencia*: el más negativo es el que debería seguir. La cola sigue siendo manual (Mandamiento 4). Ojo: una rotación redonda **no corrige** un desbalance previo, solo lo congela — para emparejar hace falta que alguien compre fuera de turno.
- **El historial ya no se recorta a 60**, porque es el libro contable: recortarlo correría los balances en silencio. Se guardan hasta 520 semanas (~10 años) y `History.tsx` muestra las últimas 60.

Se muestra en la pestaña **Compra** (tabla completa con explicación), como chip en **Integrantes**, y como epitafio en el **Cementerio**.

## Cementerio Harinoso

Registro de las bajas del grupo: nombre, mes y epitafio (el motivo, que se pide al dar de baja). Es solo informativo. Las bajas anteriores a que existiera la funcionalidad se recuperan con `applyCemeteryMigration` en `services/db.ts`.

## Arquitectura

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4.
- **Estado**: vive en `localStorage` del navegador y se sincroniza contra un backend compartido en `/api/state` (GET para leer, POST para guardar). Cada 15s se hace polling para tomar cambios de otros usuarios.
- **Backend en dev**: `server.js` (Express) guarda el estado en `state.json` local. Archivo gitignoreado — no se versiona, y puede tener datos reales de uso.
- **Backend en producción (Vercel)**: `api/state.js` es una función serverless que usa un **GitHub Gist** como almacenamiento compartido. El token (`GIST_TOKEN`) vive solo en las Environment Variables de Vercel, nunca llega al navegador.

## Desarrollo local

```bash
npm install
npm run dev   # levanta server.js (puerto 3001) + vite (puerto 5173) juntos
```

`npm run build` corre `tsc -b && vite build`. El deploy a Vercel se dispara con cada push a `main` (si el proyecto está linkeado).

## Estructura de componentes

- `App.tsx` — layout, tabs, estado global, polling, cálculo del ledger.
- `services/db.ts` — toda la lógica de dominio (rotación de miércoles, altas, historial, migraciones, sync con la nube).
- `services/ledger.ts` — el Balance de Levadura: matemática pura, derivada del historial.
- `components/Dashboard.tsx` — turno activo, pedido de la semana, gestión manual de la cola.
- `components/BalanceLevadura.tsx` — tabla de balances con su explicación.
- `components/Members.tsx` — alta/baja/edición de integrantes.
- `components/History.tsx` — historial de pedidos pasados.
- `components/Cemetery.tsx` — el Cementerio Harinoso.
- `components/LoginModal.tsx` — selección de quién sos al entrar.
- `components/WelcomeModal.tsx` — onboarding de altas nuevas.
- `components/RulesModal.tsx` — Los Mandamientos Bizcochísticos.
- `components/PastryPicker.tsx` — selector de 4 bizcochos, compartido entre Members y WelcomeModal.
- `components/SyncErrorToasts.tsx` — avisos cuando falla el guardado a la nube.
