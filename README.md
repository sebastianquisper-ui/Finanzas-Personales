# Mis Finanzas

PWA de finanzas personales (soles, interfaz en español) con Firebase Authentication (Google) y Firestore, publicada en GitHub Pages: https://sebastianquisper-ui.github.io/Finanzas-Personales/

Ver `HANDOFF-Finanzas-Personales.md` para el plan completo de reconstrucción.

## Desarrollo

```bash
npm install
npm run dev
```

`src/firebase-config.js` tiene la configuración de la app web de Firebase. No es secreta (identifica el proyecto); los datos los protegen las reglas de Firestore.

## Publicación

Cada push a `main` compila y publica en GitHub Pages (`.github/workflows/deploy.yml`). Requisitos de una sola vez:

- GitHub → Settings → Pages → Source: **GitHub Actions**.
- Firebase Console → Authentication → Configuración → Dominios autorizados: `sebastianquisper-ui.github.io`.

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

## Pruebas

```bash
npm test                  # modelo (fechas, montos, validaciones)
npm run test:firestore    # reglas y capa de datos contra el emulador (requiere Java)
```

## Seguridad

Este repositorio es público. Nunca subas contraseñas, claves de cuenta de servicio, archivos `.env` con secretos ni datos reales de gastos o ingresos. Los respaldos JSON exportados de la app anterior están en `.gitignore`.
