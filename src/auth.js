import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';
import { firebaseConfig } from './firebase-config.js';

// El popup es el camino principal: en GitHub Pages el redirect cruza dominios
// (authDomain es *.firebaseapp.com) y algunos navegadores bloquean ese almacenamiento.
// Solo se usa redirect cuando el entorno no permite popups (p. ej. algunas PWA instaladas).
const USAR_REDIRECT = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-environment']);
const SILENCIOSOS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export async function iniciarSesion() {
  if (firebaseConfig.apiKey === 'REEMPLAZAR') {
    throw Object.assign(new Error('firebaseConfig sin completar'), { code: 'app/config-pendiente' });
  }
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (USAR_REDIRECT.has(err.code)) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    if (SILENCIOSOS.has(err.code)) return;
    throw err;
  }
}

export async function resultadoRedirect() {
  try {
    await getRedirectResult(auth);
  } catch (err) {
    if (!SILENCIOSOS.has(err.code)) throw err;
  }
}

export function cerrarSesion() {
  return signOut(auth);
}

export function observarSesion(callback) {
  return onAuthStateChanged(auth, callback);
}

export function mensajeDeError(err) {
  switch (err?.code) {
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
    case 'auth/unauthorized-domain':
      return 'Este sitio no está autorizado en Firebase (Authentication → Dominios autorizados).';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo otra vez.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'app/config-pendiente':
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Falta configurar Firebase (src/firebase-config.js).';
    default:
      return 'No se pudo iniciar sesión. Inténtalo otra vez.';
  }
}
