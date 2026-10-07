# Bizcochuelos

App para gestionar la compra rotativa de bizcochos de la oficina, todos los miércoles.

## Qué hace

- **Turnos**: cada miércoles el turno pasa automáticamente a la siguiente persona en la cola (`buyerQueue`).
- **Elecciones**: cada integrante arma su pedido semanal dentro de un presupuesto de 12 **puntos** (ver abajo), eligiendo del catálogo del grupo.
- **Dashboard**: muestra quién compra esta semana, quién sigue, y el desglose del pedido total con quién come cada tipo.
- **Integrantes**: alta, baja y edición de las elecciones de cada persona.
- **Historial**: registro de los últimos pedidos (fecha, comprador, ítems) — se completa solo cada miércoles que pasa.
- **Reglas del grupo**: modal "Los Mandamientos Bizcochísticos", accesible desde el header.
- **Administración**: el catálogo (qué se puede pedir y a cuánto) y el orden de la cola solo los toca quien figura en `admin.userIds`, y con PIN.

## Puntos: por qué no se cuentan unidades

Mientras todos los bizcochos costaron lo mismo, "4 bizcochos por persona" alcanzaba
como presupuesto. Con el **pan tortuga integral** ($30 contra $25) deja de alcanzar:
donde entran 4 bizcochos comunes entran 3 tortugas, y contar unidades trataría esas
dos elecciones como distintas cuando cuestan lo mismo.

La unidad es entonces el **punto**: la fracción del presupuesto semanal que ocupa
cada cosa. Cada persona tiene 12 puntos por semana, y cada ítem cuesta
`round(precio × 12 / presupuesto)`. Con el presupuesto en $100:

| Ítem | Precio | Puntos | Entran por semana |
|---|---|---|---|
| Bizcocho común | $25 | 3 | 4 |
| Pan tortuga integral | $30 | 4 | 3 |

Los puntos son **relativos** al presupuesto, no absolutos en pesos. Eso importa
porque el historial los guarda congelados: si mañana aumenta la panadería y se
suben precios y presupuesto juntos, los puntos no se mueven y las entradas viejas
siguen significando lo mismo. Un registro en pesos se distorsionaría con cada
aumento.

Una selección está **completa** cuando ya no entra nada más, no cuando llega justo
a 12: 2 tortugas + 1 bizcocho gastan 11 puntos y sobra 1, que no alcanza para nada.
Exigir el presupuesto exacto dejaría esa combinación imposible de guardar.

## Administración (catálogo, cola y PIN)

Dos cosas no las decide cualquiera: **qué se puede pedir** y **en qué orden se
compra**. Todo lo demás sigue abierto para el grupo.

- `admin.userIds` (por defecto `['rodri']`) decide **a quién se le muestra la
  puerta** — el escudo del header y el botón "Editar" de la cola. No es seguridad:
  el login es elegir tu nombre de una lista, así que cualquiera podría entrar como
  cualquiera. Sirve para que el panel no le aparezca a quien no tiene nada que hacer ahí.
- `admin.pinHash` decide **quién pasa**. Es la única credencial real. La primera vez
  que un administrador abre el panel, la app le pide crear el PIN; se guarda hasheado
  (SHA-256 con sal fija) y el desbloqueo dura lo que dure la pestaña (`sessionStorage`).

**Alcance honesto**: un PIN corto hasheado se rompe por fuerza bruta en segundos, y
el estado compartido lo puede leer cualquiera del grupo. Esto frena el toqueteo
casual y los accidentes, no a alguien que se lo proponga. Para lo segundo haría falta
autenticación de verdad en el servidor, que hoy no existe (`api/state.js` es un proxy
sin usuarios).

Desde el panel se puede: agregar un ítem (nombre + precio, con vista previa de cuántos
entran por semana), cambiarle el precio, sacarlo del catálogo, y ajustar el presupuesto
semanal. **El nombre no se puede cambiar**: es la clave con la que quedaron guardadas
las elecciones de cada uno y los pedidos del historial. Sacar un ítem lo saca también
de las selecciones de todos — el historial no se toca, así que los pedidos viejos
siguen mostrando lo que realmente se compró ese día.

## Los Mandamientos Bizcochísticos

1. **Alta de un integrante nuevo**: no compra en su primera vuelta. Entra, come, y recién desde el miércoles siguiente pasa a la cola de compra como cualquier otro integrante.
2. **Baja del grupo**: si alguien se quiere bajar, tiene que avisar con tiempo para reacomodar la cola y el pedido antes de que le toque comprar.
3. **Sustitución del producto**: el bizcocho es la base, no una obligación — se puede reemplazar por otro producto de contenido o costo similar (medialunas, sándwiches, etc.) sin drama.
4. **Cambio de turno**: si a alguien le toca comprar y no puede ese miércoles, coordina el cambio con otro integrante. La cola no se salta, se acomoda.

(Están escritas en el código en `src/components/RulesModal.tsx` — para editarlas, tocar ahí.)

## Onboarding de altas nuevas

Desde el rediseño de julio 2026, agregar un integrante en **Integrantes → Agregar** solo pide el nombre. No se le asignan bizcochos en ese momento.

La persona queda marcada con `needsOnboarding: true` y entra 2° en la cola (no paga la próxima, le toca la siguiente — cumple el Mandamiento 1). La primera vez que esa persona selecciona su nombre en el login, ve un modal de bienvenida (con confetti) y ahí arma su pedido de 12 puntos; recién ahí puede navegar el resto de la app. Este flujo **no afecta a integrantes que ya existían** antes del cambio — solo aplica a altas nuevas.

## El historial guarda más de lo que muestra

Cada entrada del historial lleva, además del desglose por tipo, el **padrón de esa
semana** (`participants`: quién estaba y cuánto comió, en unidades y en puntos).
Hoy **ninguna pantalla lo lee**. Está a propósito.

Ese padrón existía para el **Balance de Levadura**, una tabla que medía si el reparto
era justo (`puso − comió` en puntos, con Σ balances = 0 incluyendo a los del
Cementerio). Se sacó el 2026-10-07: **nadie lo miraba**. Vivía en
`services/ledger.ts` y `components/BalanceLevadura.tsx`, con un botón central en el
footer, un chip por persona en Integrantes y un epitafio en el Cementerio — todo
recuperable del historial de git si alguna vez vuelve a interesar.

El **dato** se sigue escribiendo igual, y no es por nostalgia: el momento de la
rotación es la **única** oportunidad de registrarlo. Nadie va a recordar en marzo
quién comió qué un miércoles de octubre, así que dejar de guardarlo abriría un
agujero irreparable. Cuesta unos cientos de bytes por semana en un documento de 15 KB.

Por lo mismo el historial **no se recorta a 60**: se guardan hasta 520 semanas (~10
años) y `History.tsx` muestra las últimas 60. El que se limita es el renderizado,
nunca el dato.

## Cementerio Harinoso

Registro de las bajas del grupo: nombre, mes y epitafio (el motivo, que se pide al dar de baja). Es solo informativo. Las bajas anteriores a que existiera la funcionalidad se recuperan con `applyCemeteryMigration` en `services/db.ts`.

## Arquitectura

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4.
- **Estado**: la fuente de verdad es **siempre** el backend compartido en `/api/state`. `localStorage` es solo un caché para pintar algo mientras llega la respuesta — nunca es base de una escritura. Cada 15s se hace polling para tomar cambios de otros usuarios.
- **Backend en dev**: `server.js` (Express) guarda el estado en `state.json` local. Archivo gitignoreado — no se versiona, y puede tener datos reales de uso.
- **Backend en producción (Vercel)**: `api/state.js` es una función serverless que usa un **GitHub Gist** como almacenamiento compartido. El token (`GIST_TOKEN`) vive solo en las Environment Variables de Vercel, nunca llega al navegador.
- **No hay Firebase.** Hubo una base `bizcochuelos-71ded` (Realtime Database) antes del Gist; está borrada (devuelve `404`) y nada del código la usaba. La dependencia `firebase` igual siguió en `package.json` hasta el 2026-10-07: 40 MB y 29 subpaquetes sin un solo `import`. Se sacó, y el bundle salió con el **mismo hash** — la prueba de que no aportaba nada.

### Persistencia: por qué hay un `rev`

El estado es **un solo documento** que se reescribe entero en cada guardado. Sin control de versión eso pierde datos, y los perdió: en julio de 2026 el Gist quedó dos veces reseteado al estado semilla y se perdió una integrante que se había dado de alta.

Fueron dos fallas distintas, las dos arregladas acá:

1. **Un dispositivo sin datos publicaba su semilla.** `getAppState()` subía `INITIAL_STATE` a la nube cuando no encontraba nada en `localStorage`. Abrir la app en un celular nuevo, en incógnito, o después de que el navegador limpiara el storage (iOS lo hace solo a los ~7 días sin uso, y la app se usa una vez por semana) borraba los datos de todo el grupo.
2. **Dos personas editando se pisaban.** Cada una leía el documento, cambiaba su parte y subía el documento completo; la última en guardar borraba el cambio de la otra.

El estado lleva ahora un contador `rev` que **asigna solo el servidor**. Reglas:

- El cliente manda `POST { expectedRev, state }` con la `rev` sobre la que calculó su cambio.
- El servidor escribe **solo si** `expectedRev` sigue siendo la `rev` actual; si no, responde `409` con el estado fresco.
- Ante un `409` el cliente **reaplica su cambio sobre el estado que ganó** y reintenta. Por eso las mutaciones en `db.ts` se escriben como "aplicá este cambio", no como "guardá este estado".
- `expectedRev: null` significa "creo que la nube está vacía", y el servidor lo acepta solo si de verdad lo está. Eso es lo que hace imposible el caso 1.
- Un `GET` que falla devuelve **502, no `null`**: el cliente tiene que poder distinguir "todavía no hay nada" de "el backend está caído".
- Si no se puede guardar, la mutación **falla y se avisa**, y el cambio no se muestra como hecho. No existe el guardado "solo en este dispositivo": era mentira, porque el siguiente refresco lo borraba igual.

La lectura y la escritura contra el Gist no son atómicas entre sí (la API de Gists no tiene escritura condicional), así que la ventana de carrera no es cero — pero pasa de ser todo el rato que alguien tiene el formulario abierto a ser el round-trip del servidor a GitHub.

### Cuando el token del Gist se vence (modo solo lectura)

El 2026-09-29 el `GIST_TOKEN` de Vercel dejó de ser válido y GitHub empezó a
responder `401 Bad credentials`. `/api/state` devolvía `502` tanto al leer como
al guardar, y el fallo de lectura se descartaba en silencio en `App.tsx`
(`if (!read.ok) return;`). Resultado: cada teléfono siguió mostrando su copia
local del 29/09 como si estuviera al día y **la cola de turnos quedó congelada
una semana** — le tocó a Fabri el 30/09 y la app seguía marcando a Fabri el
06/10. Nadie vio un error porque no había ninguno que ver.

Dos cambios para que no se repita:

- **Leer no depende del token.** El Gist es público, así que si la lectura
  autenticada falla, `api/state.js` reintenta contra el CDN
  (`gist.githubusercontent.com/.../raw/state.json`) y marca la respuesta con la
  cabecera `X-Bizcochuelos-Degraded: read-only`. La rotación de los miércoles se
  calcula en el cliente, así que con la lectura viva **en pantalla le toca a
  quien de verdad le toca**, aunque no se pueda asentar en el Gist. Guardar sí
  necesita el token: el `POST` corta con `503` y un motivo que se entiende
  ("hay que renovar GIST_TOKEN en Vercel") en vez de un `502` de GitHub.
- **Un backend caído se ve.** Los fallos de lectura (en el arranque y en el
  polling) ahora avisan por toast, con un enfriamiento de 5 minutos para no
  tapar la pantalla cada 15 s.

**Cómo se arregla de raíz** (es lo único que no puede hacer el código): generar
un token nuevo en GitHub → Settings → Developer settings → Tokens, con permiso
**solo de `gist`**, y pegarlo en Vercel → Settings → Environment Variables →
`GIST_TOKEN`, y redeployar. En cuanto vuelva a escribir, la rotación atrasada se
asienta sola: `checkAndRotateWednesday` avanza todos los miércoles que falten,
de uno en uno, registrando el historial de cada uno.

Para comprobar si está vivo: `curl -s https://bizcochuelos.vercel.app/api/state`
— un `{"ok":false,...}` en vez del estado es el síntoma.

### La fecha del turno es local, no UTC

`checkAndRotateWednesday` comparó durante mucho tiempo contra
`new Date().toISOString()`, que es **UTC**. En Uruguay (UTC-3) el día cambia ahí
a las 21:00, así que quien abría la app un miércoles de noche adelantaba el turno
tres horas antes de que terminara el día de compra: el Dashboard decía
"miércoles 16" (que usa `getDay()`, local) y la cola ya mostraba al comprador del
23. Quedó registrado en el historial del Gist: la rotación del 16/09 se escribió
a las `2026-09-17T00:00:44Z`, o sea el miércoles 21:00 local. Ahora las dos
mitades usan la fecha local (`todayLocalISO()`).

## Desarrollo local

```bash
npm install
npm run dev   # levanta server.js (puerto 3001) + vite (puerto 5173) juntos
```

`npm run build` corre `tsc -b && vite build`. El deploy a Vercel se dispara con cada push a `main` (si el proyecto está linkeado).

## Estructura de componentes

- `App.tsx` — layout, tabs, estado global, polling, sincronización con la nube.
- `services/db.ts` — toda la lógica de dominio (rotación de miércoles, altas, historial, migraciones, sync con la nube).
- `services/catalog.ts` — la aritmética de puntos: precio → puntos, presupuesto, validación de una selección.
- `services/admin.ts` — hash y verificación del PIN, y quién ve la puerta.
- `components/Dashboard.tsx` — turno activo, pedido de la semana, gestión manual de la cola.
- `components/Members.tsx` — alta/baja/edición de integrantes.
- `components/History.tsx` — historial de pedidos pasados.
- `components/Cemetery.tsx` — el Cementerio Harinoso.
- `components/LoginModal.tsx` — selección de quién sos al entrar.
- `components/WelcomeModal.tsx` — onboarding de altas nuevas.
- `components/RulesModal.tsx` — Los Mandamientos Bizcochísticos.
- `components/PastryPicker.tsx` — selector del pedido semanal por puntos, compartido entre Members y WelcomeModal.
- `components/AdminPanel.tsx` — catálogo y presupuesto (detrás del PIN).
- `components/PinModal.tsx` — la puerta: crea o pide el PIN de administración.
- `components/SyncErrorToasts.tsx` — avisos cuando falla el guardado a la nube.
