import './style.css';
import { Chart } from 'chart.js/auto';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';

// Placeholder de arranque: confirma que Vite, Firebase Auth y Chart.js
// quedan conectados antes de portar las pantallas reales.
const app = document.getElementById('app');

function render(user) {
  app.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'Mis Finanzas';
  app.appendChild(title);

  if (user) {
    const p = document.createElement('p');
    p.textContent = `Sesión iniciada como ${user.displayName ?? user.email}`;
    app.appendChild(p);

    const btn = document.createElement('button');
    btn.textContent = 'Cerrar sesión';
    btn.onclick = () => signOut(auth);
    app.appendChild(btn);
  } else {
    const p = document.createElement('p');
    p.textContent = 'Paso 1 del traspaso: Vite + Firebase + Chart.js conectados.';
    app.appendChild(p);

    const btn = document.createElement('button');
    btn.textContent = 'Iniciar sesión con Google';
    btn.onclick = () =>
      signInWithPopup(auth, googleProvider).catch((err) =>
        console.error('Error al iniciar sesión:', err)
      );
    app.appendChild(btn);
  }
}

onAuthStateChanged(auth, render);

// Confirma que Chart.js quedó disponible (sin renderizar aún un gráfico real).
console.info('Chart.js listo:', Chart.version);
