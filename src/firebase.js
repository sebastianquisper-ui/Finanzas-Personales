import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
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
