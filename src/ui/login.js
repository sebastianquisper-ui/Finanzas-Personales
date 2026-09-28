import { h } from '../dom.js';
import { iniciarSesion, mensajeDeError } from '../auth.js';
import { iconoApp } from './icono.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function logoGoogle() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  const trazos = [
    ['#FFC107', 'M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z'],
    ['#FF3D00', 'M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z'],
    ['#4CAF50', 'M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z'],
    ['#1976D2', 'M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z'],
  ];
  for (const [fill, d] of trazos) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('fill', fill);
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export function pantallaAcceso(errorInicial) {
  const error = h('p', { class: 'acceso-error', role: 'alert' });
  const etiqueta = h('span', {}, 'Continuar con Google');
  const boton = h('button', { class: 'boton-google', type: 'button' }, logoGoogle(), etiqueta);

  function mostrarError(err) {
    console.error(err);
    error.textContent = mensajeDeError(err);
  }

  boton.addEventListener('click', async () => {
    error.textContent = '';
    boton.disabled = true;
    etiqueta.textContent = 'Abriendo Google…';
    try {
      await iniciarSesion();
    } catch (err) {
      mostrarError(err);
    } finally {
      boton.disabled = false;
      etiqueta.textContent = 'Continuar con Google';
    }
  });

  if (errorInicial) mostrarError(errorInicial);

  return h(
    'main',
    { class: 'acceso' },
    iconoApp('acceso-icono'),
    h('h1', {}, 'Mis Finanzas'),
    h('p', { class: 'acceso-lema' }, 'Tus cuentas en soles, en tu bolsillo.'),
    boton,
    error,
    h(
      'p',
      { class: 'acceso-nota' },
      'Tus datos se guardan en tu cuenta y solo tú puedes verlos.'
    )
  );
}

export function pantallaCarga() {
  return h(
    'main',
    { class: 'acceso', 'aria-busy': 'true' },
    iconoApp('acceso-icono'),
    h('p', { class: 'acceso-lema' }, 'Cargando…')
  );
}
