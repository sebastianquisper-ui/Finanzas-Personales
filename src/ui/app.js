import { h, mount } from '../dom.js';
import { moverPeriodo, rangoPeriodo } from '../fechas.js';
import { fechaLocal } from '../modelo.js';
import { FILTROS_INICIALES } from '../resumen.js';
import { alCambiarTemaSistema, montosOcultos, ocultarMontos } from '../tema.js';
import { mostrarError } from './aviso.js';
import { abrirFormulario } from './formulario.js';
import { destruirGraficos } from './graficos.js';
import { iconoApp } from './icono.js';
import { icono } from './iconos.js';
import { vistaInicio } from './inicio.js';
import { abrirMenu } from './menu.js';
import { vistaMetas } from './metas.js';
import { vistaMovimientos } from './movimientos.js';
import { vistaPresupuesto } from './presupuesto.js';

const PESTANAS = [
  { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
  { id: 'movimientos', nombre: 'Movimientos', icono: 'lista' },
  { id: 'presupuesto', nombre: 'Presupuesto', icono: 'presupuesto' },
  { id: 'metas', nombre: 'Metas', icono: 'metas' },
];

const VISTAS = {
  inicio: vistaInicio,
  movimientos: vistaMovimientos,
  presupuesto: vistaPresupuesto,
  metas: vistaMetas,
};

const TODO = { desde: '0000-01-01', hasta: '9999-12-31' };

export function iniciarApp(root, usuario, datos) {
  const hoy = fechaLocal();
  const estado = {
    config: null,
    movs: [],
    // Mes calendario actual (todos los medios): presupuesto y sus avisos.
    movsMes: [],
    metas: null,
    historial: null,
    medio: 'digital',
    periodo: { tipo: 'mes', ref: fechaLocal() },
    pestana: 'inicio',
    filtros: { ...FILTROS_INICIALES },
    comparacion: {
      abierta: false,
      a: { tipo: 'mes', ref: hoy },
      b: { tipo: 'mes', ref: moverPeriodo('mes', hoy, -1) },
      movsA: null,
      movsB: null,
    },
  };

  let cancelarMovs = null;
  let cancelarHistorial = null;
  let pendientesAlMontar = [];
  let errorMostrado = false;

  function errorCarga(err) {
    if (errorMostrado) return;
    errorMostrado = true;
    mostrarError(err);
  }

  function suscribirPeriodo() {
    cancelarMovs?.();
    const { desde, hasta } = rangoPeriodo(estado.periodo.tipo, estado.periodo.ref);
    estado.movs = [];
    cancelarMovs = datos.escucharMovimientos(desde, hasta, (movs) => {
      estado.movs = movs;
      render();
    }, errorCarga);
  }

  // "Todo el historial" lee todos los movimientos: solo mientras el chip está activo.
  function suscribirHistorial() {
    cancelarHistorial?.();
    cancelarHistorial = null;
    estado.historial = null;
    if (!estado.filtros.historial) return;
    cancelarHistorial = datos.escucharMovimientos(TODO.desde, TODO.hasta, (movs) => {
      estado.historial = movs;
      render();
    }, errorCarga);
  }

  const ctx = {
    estado,
    datos,
    usuario,
    cambiar(parcial) {
      const antes = { periodo: estado.periodo, historial: estado.filtros.historial };
      Object.assign(estado, parcial);
      const r1 = rangoPeriodo(antes.periodo.tipo, antes.periodo.ref);
      const r2 = rangoPeriodo(estado.periodo.tipo, estado.periodo.ref);
      if (r1.desde !== r2.desde || r1.hasta !== r2.hasta) suscribirPeriodo();
      if (antes.historial !== estado.filtros.historial) suscribirHistorial();
      render();
    },
    irA(pestana, extra = {}) {
      ctx.cambiar({ pestana, ...extra });
      window.scrollTo(0, 0);
    },
    abrirFormulario: (opciones) => abrirFormulario(ctx, opciones),
    alMontar(fn) {
      pendientesAlMontar.push(fn);
    },
    alternarMontos() {
      ocultarMontos(!montosOcultos());
      render();
    },
    render,
  };

  const botonOcultar = h('button', { type: 'button', class: 'boton-icono', onClick: () => ctx.alternarMontos() });
  const contenido = h('main', { class: 'contenido', id: 'contenido' });
  const botonesNav = new Map();

  const nav = h(
    'nav',
    { class: 'barra', 'aria-label': 'Secciones' },
    PESTANAS.slice(0, 2).map(botonNav),
    h(
      'button',
      { type: 'button', class: 'boton-agregar', 'aria-label': 'Registrar movimiento', onClick: () => ctx.abrirFormulario() },
      icono('mas', 28)
    ),
    PESTANAS.slice(2).map(botonNav)
  );

  function botonNav(p) {
    const boton = h(
      'button',
      { type: 'button', class: 'barra-boton', onClick: () => ctx.irA(p.id) },
      icono(p.icono),
      h('span', {}, p.nombre)
    );
    botonesNav.set(p.id, boton);
    return boton;
  }

  mount(
    root,
    h(
      'div',
      { class: 'app' },
      h(
        'header',
        { class: 'cabecera' },
        iconoApp('cabecera-icono'),
        h('h1', {}, 'Mis Finanzas'),
        botonOcultar,
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Más opciones', onClick: () => abrirMenu(ctx) }, icono('opciones'))
      ),
      contenido,
      nav
    )
  );

  function render() {
    const ocultos = montosOcultos();
    botonOcultar.setAttribute('aria-label', ocultos ? 'Mostrar montos' : 'Ocultar montos');
    botonOcultar.setAttribute('aria-pressed', String(ocultos));
    botonOcultar.replaceChildren(icono(ocultos ? 'ojoCerrado' : 'ojo'));
    for (const [id, boton] of botonesNav) {
      if (id === estado.pestana) boton.setAttribute('aria-current', 'page');
      else boton.removeAttribute('aria-current');
    }

    // Si llegan datos mientras se escribe en un campo marcado con data-foco, el campo nuevo
    // recupera el foco y lo escrito.
    const activo = document.activeElement;
    const foco = contenido.contains(activo) ? activo.dataset.foco : null;
    const escrito = foco ? activo.value : null;
    destruirGraficos();
    pendientesAlMontar = [];
    mount(contenido, VISTAS[estado.pestana](ctx));
    for (const fn of pendientesAlMontar) fn();
    if (foco) {
      const campo = contenido.querySelector(`[data-foco="${CSS.escape(foco)}"]`);
      if (campo) {
        campo.value = escrito;
        campo.focus();
        try {
          campo.setSelectionRange(escrito.length, escrito.length);
        } catch {
          // Algunos tipos de campo (fecha) no tienen selección.
        }
      }
    }
  }

  ocultarMontos(montosOcultos());
  const dejarDeEscucharTema = alCambiarTemaSistema(render);
  const cancelarConfig = datos.escucharConfig((config) => {
    estado.config = config;
    render();
  }, errorCarga);
  const mes = rangoPeriodo('mes', hoy);
  const cancelarMes = datos.escucharMovimientos(mes.desde, mes.hasta, (movs) => {
    estado.movsMes = movs;
    render();
  }, errorCarga);
  const cancelarMetas = datos.escucharMetas((metas) => {
    estado.metas = metas;
    if (estado.pestana === 'metas') render();
  }, errorCarga);
  suscribirPeriodo();
  render();

  return function detener() {
    cancelarConfig();
    dejarDeEscucharTema();
    cancelarMovs?.();
    cancelarHistorial?.();
    cancelarMes();
    cancelarMetas();
    destruirGraficos();
    for (const d of document.querySelectorAll('dialog')) d.remove();
  };
}
