import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';
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

// Solo en desarrollo (npm run dev:emuladores): Auth y Firestore locales, sin tocar el proyecto real.
if (import.meta.env.DEV && import.meta.env.VITE_EMULADORES) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
