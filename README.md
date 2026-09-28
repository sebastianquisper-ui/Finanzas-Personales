# Mis Finanzas

PWA de finanzas personales (soles, interfaz en español) con Firebase Authentication (Google) y Firestore. Ver `HANDOFF-Finanzas-Personales.md` para el plan completo de reconstrucción.

## Desarrollo

```bash
npm install
npm run dev
```

Antes de correrlo, completa los valores reales del proyecto Firebase en `src/firebase-config.js` (Firebase Console → Configuración del proyecto → Tus apps). Ese archivo no contiene secretos, pero sí identifica el proyecto.

## Build

```bash
npm run build
```

## Seguridad

Este repositorio es público. Nunca subas contraseñas, claves de cuenta de servicio, archivos `.env` con secretos ni datos reales de gastos o ingresos. Los respaldos JSON exportados de la app anterior están en `.gitignore`.
