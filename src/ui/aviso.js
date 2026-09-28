import { h } from '../dom.js';

let actual = null;

// Un solo aviso a la vez; con acción ("Deshacer") dura 6 s.
export function mostrarAviso(texto, { accion, alAccion, duracion } = {}) {
  actual?.cerrar();
  const tiempo = duracion ?? (accion ? 6000 : 3000);
  const aviso = h('div', { class: 'aviso', role: 'status' }, h('span', {}, texto));
  if (accion) {
    aviso.append(
      h('button', {
        type: 'button',
        class: 'aviso-accion',
        onClick: () => {
          cerrar();
          alAccion();
        },
      }, accion)
    );
  }

  const temporizador = setTimeout(cerrar, tiempo);
  function cerrar() {
    clearTimeout(temporizador);
    aviso.remove();
    if (actual?.aviso === aviso) actual = null;
  }

  // Dentro del <dialog> abierto si lo hay, para quedar por encima de la capa superior.
  (document.querySelector('dialog[open]') ?? document.body).append(aviso);
  actual = { aviso, cerrar };
  return cerrar;
}

export function mostrarError(err) {
  console.error(err);
  const mensaje =
    err?.code === 'app/validacion'
      ? err.message
      : err?.code === 'permission-denied'
        ? 'No tienes permiso para guardar esto. Revisa las reglas de Firestore.'
        : 'Algo salió mal. Inténtalo otra vez.';
  mostrarAviso(mensaje, { duracion: 5000 });
}
