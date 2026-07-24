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

- `App.tsx` — layout, tabs, estado global, polling.
- `services/db.ts` — toda la lógica de dominio (rotación de miércoles, altas, historial, sync con la nube).
- `components/Dashboard.tsx` — turno activo, pedido de la semana, gestión manual de la cola.
- `components/Members.tsx` — alta/baja/edición de integrantes.
- `components/History.tsx` — historial de pedidos pasados.
- `components/WelcomeModal.tsx` — onboarding de altas nuevas.
- `components/RulesModal.tsx` — Los Mandamientos Bizcochísticos.
- `components/PastryPicker.tsx` — selector de 4 bizcochos, compartido entre Members y WelcomeModal.
