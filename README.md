# Mis Finanzas

PWA de finanzas personales (soles, interfaz en español) con Firebase Authentication (Google) y Firestore, publicada en GitHub Pages: https://sebastianquisper-ui.github.io/Finanzas-Personales/

Ver `HANDOFF-Finanzas-Personales.md` para el plan completo de reconstrucción.

## Desarrollo

```bash
npm install
npm run dev
```

Para probar sin tocar el proyecto real (requiere Java): `npm run dev:emuladores` levanta Auth y Firestore locales y conecta la app a ellos.

`src/firebase-config.js` tiene la configuración de la app web de Firebase. No es secreta (identifica el proyecto); los datos los protegen las reglas de Firestore.

## Publicación

Cada push a `main` compila y publica en GitHub Pages (`.github/workflows/deploy.yml`). Requisitos de una sola vez:

- GitHub → Settings → Pages → Source: **GitHub Actions**.
- Firebase Console → Authentication → Configuración → Dominios autorizados: `sebastianquisper-ui.github.io`.

## Instalar en el celular (PWA)

En Android, abre el sitio en Chrome y toca **Instalar app** (o menú ⋮ → *Agregar a la pantalla principal*). Se instala con su icono y nombre, y abre a pantalla completa.

- `vite-plugin-pwa` genera el manifest y un service worker que precarga el cascarón de la app (HTML, JS, CSS e iconos) y guarda las fuentes en caché.
- Firestore usa persistencia local: sin conexión se ven los datos ya cargados y lo que registres se sincroniza al volver la señal.
- Las versiones nuevas se instalan solas y se usan al volver a abrir la app.

## Datos en Firestore

```
users/{uid}/config/main       categoriasGasto, categoriasIngreso, presupuestos, saldosCent
users/{uid}/movimientos/{id}  tipo, categoria, monto, fecha, nota, medio, transferId?, creado
users/{uid}/metas/{id}        nombre, objetivo, limite, aportes[], creado
```

- `saldosCent` guarda el saldo de cada billetera en céntimos enteros y se actualiza con `increment()` en el mismo batch que cada movimiento, para no leer todo el historial al abrir la app. `recalcularSaldos()` lo reconstruye desde cero.
- Las pantallas consultan solo el rango de fechas visible.
- Las dos patas de una transferencia comparten `transferId` y se crean, editan y borran en un solo batch.

### Reglas de seguridad

Las reglas están en `firestore.rules`: cada usuario solo lee y escribe bajo `users/{su uid}`, y se validan tipos, montos, medios y fechas. **No se publican solas**: cópialas en Firebase Console → Firestore Database → Reglas → Publicar (o `npx firebase deploy --only firestore:rules` desde una computadora).

## Código

- `src/modelo.js`, `src/fechas.js`, `src/resumen.js`, `src/presupuesto.js`, `src/metas.js`, `src/formato.js`: lógica pura (validaciones, periodos, totales, presupuestos, metas, formato en soles).
- `src/datos.js`: acceso a Firestore.
- `src/ui/`: pantallas (`inicio.js`, `movimientos.js`, `presupuesto.js`, `metas.js`), comparación de periodos, formulario en hoja inferior (`formulario.js`), menú, gráficos (Chart.js) y componentes.

## Pruebas

```bash
npm test                  # modelo, periodos, resúmenes, presupuestos, metas y formato
npm run test:firestore    # reglas y capa de datos contra el emulador (requiere Java)
```

## Seguridad

Este repositorio es público. Nunca subas contraseñas, claves de cuenta de servicio, archivos `.env` con secretos ni datos reales de gastos o ingresos. Los respaldos JSON exportados de la app anterior están en `.gitignore`.
