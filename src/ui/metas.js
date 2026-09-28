import { h, mount } from '../dom.js';
import { fechaCorta, sumarDias } from '../fechas.js';
import { MAX_NOMBRE_META, esFecha, fechaLocal, parsearMonto } from '../modelo.js';
import { ordenarMetas, progresoMeta } from '../metas.js';
import { mostrarAviso, mostrarError } from './aviso.js';
import { barraProgreso, monto, segmentado, vacio } from './componentes.js';
import { abrirHoja } from './hoja.js';
import { icono } from './iconos.js';

function campo(etiqueta, ...contenido) {
  return h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, etiqueta), ...contenido);
}

function campoMonto(valor = '', etiqueta = 'Monto en soles') {
  const input = h('input', {
    class: 'monto-campo cifra',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder: '0.00',
    'aria-label': etiqueta,
    value: valor,
  });
  return { input, envoltura: h('label', { class: 'monto-envoltura' }, h('span', { class: 'monto-prefijo cifra' }, 'S/'), input) };
}

function detalleMeta(meta, p) {
  if (p.cumplida) return h('p', { class: 'meta-estado cumplida' }, '¡Meta cumplida!');
  if (p.vencida) {
    return h('p', { class: 'meta-estado vencida' }, `La fecha límite (${fechaCorta(meta.limite)}) ya pasó. Faltan `, monto(p.faltante), '.');
  }
  if (p.porMes != null) {
    return h('p', { class: 'meta-estado' }, 'Ahorra ', monto(p.porMes), ` al mes hasta el ${fechaCorta(meta.limite)}.`);
  }
  return h('p', { class: 'meta-estado' }, 'Faltan ', monto(p.faltante), '.');
}

function tarjetaMeta(ctx, meta, hoy) {
  const p = progresoMeta(meta, hoy);
  return h(
    'section',
    { class: 'tarjeta meta' },
    h(
      'div',
      { class: 'tarjeta-cabecera' },
      h('h2', {}, meta.nombre),
      h('button', { type: 'button', class: 'boton-icono', 'aria-label': `Editar meta ${meta.nombre}`, onClick: () => abrirFormularioMeta(ctx, meta) }, icono('opciones'))
    ),
    h(
      'p',
      { class: 'meta-avance' },
      monto(p.ahorrado, { clase: 'cifra meta-ahorrado' }),
      h('span', { class: 'texto-suave' }, ' de '),
      monto(meta.objetivo),
      h('span', { class: 'meta-pct' }, `${Math.round(p.pct * 100)} %`)
    ),
    barraProgreso(p.pct, 'meta', `${meta.nombre}: ${Math.round(p.pct * 100)} % ahorrado`),
    detalleMeta(meta, p),
    h(
      'div',
      { class: 'meta-acciones' },
      h('button', { type: 'button', class: 'boton boton-secundario', onClick: () => abrirAporte(ctx, meta, 'aportar') }, 'Aportar'),
      h(
        'button',
        { type: 'button', class: 'boton boton-secundario', disabled: p.ahorrado <= 0, onClick: () => abrirAporte(ctx, meta, 'retirar') },
        'Retirar'
      )
    )
  );
}

export function vistaMetas(ctx) {
  const { metas } = ctx.estado;
  const hoy = fechaLocal();
  return h(
    'div',
    { class: 'vista' },
    h('p', { class: 'nota-metas' }, 'El dinero de las metas se lleva aparte: no cambia el saldo de Digital ni Efectivo.'),
    metas == null
      ? vacio('Cargando metas…')
      : metas.length
        ? ordenarMetas(metas).map((m) => tarjetaMeta(ctx, m, hoy))
        : h('section', { class: 'tarjeta' }, vacio('Todavía no tienes metas. Crea una para empezar a ahorrar.')),
    h('button', { type: 'button', class: 'boton boton-primario boton-ancho', onClick: () => abrirFormularioMeta(ctx) }, 'Nueva meta')
  );
}

function abrirFormularioMeta(ctx, meta = null) {
  const nombre = h('input', {
    class: 'texto-campo',
    type: 'text',
    maxlength: MAX_NOMBRE_META,
    placeholder: 'Por ejemplo: Laptop nueva',
    'aria-label': 'Nombre de la meta',
    value: meta?.nombre ?? '',
    enterkeyhint: 'next',
  });
  const objetivo = campoMonto(meta ? String(meta.objetivo) : '', 'Monto objetivo en soles');
  const limite = h('input', { class: 'texto-campo fecha-campo', type: 'date', 'aria-label': 'Fecha límite', value: meta?.limite ?? '', min: fechaLocal() });
  const error = h('p', { class: 'form-error', role: 'alert' });

  function guardar(e) {
    e.preventDefault();
    error.textContent = '';
    const datos = { nombre: nombre.value, objetivo: parsearMonto(objetivo.input.value), limite: limite.value };
    try {
      if (meta) ctx.datos.actualizarMeta(meta, datos).catch(mostrarError);
      else ctx.datos.crearMeta(datos).listo.catch(mostrarError);
    } catch (err) {
      if (err.code !== 'app/validacion') throw err;
      error.textContent = err.message;
      return;
    }
    hoja.cerrar();
    mostrarAviso(meta ? 'Meta actualizada' : 'Meta creada');
  }

  function eliminar() {
    hoja.cerrar();
    ctx.datos.eliminarMeta(meta).catch(mostrarError);
    mostrarAviso('Meta eliminada', { accion: 'Deshacer', alAccion: () => ctx.datos.restaurarMeta(meta).catch(mostrarError) });
  }

  const formulario = h(
    'form',
    { class: 'form-mov', novalidate: true, onSubmit: guardar },
    campo('Nombre', nombre),
    campo('Objetivo', objetivo.envoltura),
    campo(
      'Fecha límite (opcional)',
      h(
        'div',
        { class: 'fecha-atajos' },
        limite,
        h('button', { type: 'button', class: 'chip', onClick: () => (limite.value = '') }, 'Sin fecha')
      )
    ),
    error,
    h(
      'div',
      { class: 'form-acciones' },
      meta ? h('button', { type: 'button', class: 'boton boton-peligro', onClick: eliminar }, 'Eliminar') : null,
      h('button', { type: 'submit', class: 'boton boton-primario' }, 'Guardar')
    )
  );

  const hoja = abrirHoja({ titulo: meta ? 'Editar meta' : 'Nueva meta', contenido: formulario });
  if (!meta) nombre.focus();
}

function abrirAporte(ctx, meta, modoInicial) {
  const hoy = fechaLocal();
  let modo = modoInicial;
  const { ahorrado } = progresoMeta(meta, hoy);
  const cantidad = campoMonto();
  const fecha = h('input', { class: 'texto-campo fecha-campo', type: 'date', 'aria-label': 'Fecha', value: hoy });
  const zonaModo = h('div');
  const zonaFecha = h('div', { class: 'fecha-atajos' });
  const error = h('p', { class: 'form-error', role: 'alert' });

  function dibujar() {
    mount(
      zonaModo,
      segmentado({
        opciones: [
          { id: 'aportar', nombre: 'Aportar' },
          { id: 'retirar', nombre: 'Retirar' },
        ],
        valor: modo,
        etiqueta: 'Aportar o retirar',
        clase: 'segmentado-ancho',
        alCambiar: (m) => {
          modo = m;
          dibujar();
        },
      })
    );
    mount(
      zonaFecha,
      [
        ['Hoy', hoy],
        ['Ayer', sumarDias(hoy, -1)],
      ].map(([texto, valor]) =>
        h('button', { type: 'button', class: 'chip', 'aria-pressed': String(fecha.value === valor), onClick: () => ((fecha.value = valor), dibujar()) }, texto)
      ),
      fecha
    );
  }
  fecha.addEventListener('change', dibujar);

  function guardar(e) {
    e.preventDefault();
    error.textContent = '';
    const valor = parsearMonto(cantidad.input.value);
    if (!(valor > 0)) return (error.textContent = 'Ingresa un monto mayor que 0.');
    if (!esFecha(fecha.value)) return (error.textContent = 'Elige una fecha válida.');
    const firmado = modo === 'retirar' ? -valor : valor;
    try {
      ctx.datos.aportarAMeta(meta, firmado, fecha.value).catch(mostrarError);
    } catch (err) {
      if (err.code !== 'app/validacion') throw err;
      error.textContent = err.message;
      return;
    }
    hoja.cerrar();
    const cumplida = progresoMeta({ ...meta, aportes: [...(meta.aportes ?? []), { monto: firmado }] }, hoy).cumplida;
    mostrarAviso(cumplida && modo === 'aportar' ? `¡Meta cumplida! ${meta.nombre} llegó a su objetivo.` : modo === 'aportar' ? 'Aporte registrado' : 'Retiro registrado');
  }

  dibujar();
  const formulario = h(
    'form',
    { class: 'form-mov', novalidate: true, onSubmit: guardar },
    zonaModo,
    h('p', { class: 'texto-suave meta-ahorro-actual' }, 'Ahorrado en esta meta: ', monto(ahorrado)),
    cantidad.envoltura,
    h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Fecha'), zonaFecha),
    error,
    h('div', { class: 'form-acciones' }, h('button', { type: 'submit', class: 'boton boton-primario' }, 'Guardar'))
  );
  const hoja = abrirHoja({ titulo: meta.nombre, contenido: formulario });
  cantidad.input.focus();
}
