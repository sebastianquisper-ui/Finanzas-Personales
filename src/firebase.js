import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = 'es';

export const googleProvider = new GoogleAuthProvider();
// Tras cerrar sesión, deja elegir otra cuenta en vez de reentrar con la misma.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Persistencia sin conexión: la app debe poder leer/escribir en el metro o sin datos.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Solo con VITE_EMULADORES=1 (npm run dev:emuladores): Auth y Firestore locales. El build
// publicado no define la variable, así que este bloque ni siquiera se incluye.
if (import.meta.env.VITE_EMULADORES) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // El emulador acepta credenciales de Google sin firmar: permite entrar en pruebas automáticas.
  window.__entrarConEmulador = (email) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
}
