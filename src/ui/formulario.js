import { h, mount } from '../dom.js';
import { rangoPeriodo, sumarDias } from '../fechas.js';
import { NOMBRE_MEDIO } from '../formato.js';
import { MAX_CATEGORIA, MAX_NOTA, MEDIOS, esFecha, esTransferencia, fechaLocal, normalizarConfig, parsearMonto } from '../modelo.js';
import { mostrarAviso, mostrarError } from './aviso.js';
import { segmentado } from './componentes.js';
import { abrirHoja } from './hoja.js';
import { icono } from './iconos.js';

const TIPOS = [
  { id: 'gasto', nombre: 'Gasto' },
  { id: 'ingreso', nombre: 'Ingreso' },
  { id: 'transferencia', nombre: 'Transferir' },
];

const otroMedio = (m) => (m === 'digital' ? 'efectivo' : 'digital');

function campo(etiqueta, ...contenido) {
  return h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, etiqueta), ...contenido);
}

// opciones: { mov } para editar, o { tipo } para uno nuevo ('gasto' | 'ingreso' | 'transferencia').
export function abrirFormulario(ctx, { mov, tipo: tipoInicial = 'gasto' } = {}) {
  const editando = Boolean(mov);
  const esTransfer = editando && esTransferencia(mov);
  const config = ctx.estado.config ?? normalizarConfig();
  const hoy = fechaLocal();

  const s = {
    tipo: esTransfer ? 'transferencia' : (mov?.tipo ?? tipoInicial),
    medio: mov?.medio ?? ctx.estado.medio,
    origen: esTransfer ? (mov.tipo === 'gasto' ? mov.medio : otroMedio(mov.medio)) : ctx.estado.medio,
    categoria: esTransfer ? null : (mov?.categoria ?? null),
    otra: false,
  };

  const inputMonto = h('input', {
    class: 'monto-campo cifra',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder: '0.00',
    'aria-label': 'Monto en soles',
    value: mov ? String(mov.monto) : '',
  });
  const inputOtra = h('input', {
    class: 'texto-campo',
    type: 'text',
    maxlength: MAX_CATEGORIA,
    placeholder: 'Nombre de la categoría',
    'aria-label': 'Nueva categoría',
    enterkeyhint: 'done',
  });
  const inputFecha = h('input', { class: 'texto-campo fecha-campo', type: 'date', 'aria-label': 'Fecha', value: mov?.fecha ?? hoy, required: true });
  const inputNota = h('input', {
    class: 'texto-campo',
    type: 'text',
    maxlength: MAX_NOTA,
    placeholder: 'Nota (opcional)',
    'aria-label': 'Nota',
    value: mov?.nota ?? '',
    enterkeyhint: 'done',
  });
  const error = h('p', { class: 'form-error', role: 'alert' });

  const zonaTipo = h('div');
  const zonaMedio = h('div');
  const zonaCategoria = h('div');
  const zonaFecha = h('div', { class: 'fecha-atajos' });

  function categoriasDelTipo() {
    const lista = [...(s.tipo === 'ingreso' ? config.categoriasIngreso : config.categoriasGasto)];
    if (s.categoria && !s.otra && !lista.includes(s.categoria)) lista.push(s.categoria);
    return lista;
  }

  function dibujar() {
    mount(
      zonaTipo,
      esTransfer
        ? null
        : segmentado({
            opciones: editando ? TIPOS.slice(0, 2) : TIPOS,
            valor: s.tipo,
            etiqueta: 'Tipo',
            clase: 'segmentado-ancho',
            alCambiar: (tipo) => {
              s.tipo = tipo;
              if (tipo !== 'transferencia' && !categoriasDelTipo().includes(s.categoria)) s.categoria = null;
              dibujar();
            },
          })
    );

    if (s.tipo === 'transferencia') {
      const destino = otroMedio(s.origen);
      mount(
        zonaMedio,
        campo(
          'Dirección',
          h(
            'div',
            { class: 'direccion' },
            h('span', { class: 'direccion-medio' }, NOMBRE_MEDIO[s.origen]),
            h(
              'button',
              {
                type: 'button',
                class: 'boton-transferir pequeno',
                'aria-label': 'Invertir dirección',
                disabled: esTransfer,
                onClick: () => {
                  s.origen = destino;
                  dibujar();
                },
              },
              icono('cambiar', 18)
            ),
            h('span', { class: 'direccion-medio' }, NOMBRE_MEDIO[destino])
          ),
          esTransfer ? h('span', { class: 'campo-ayuda' }, 'Para cambiar la dirección, elimínala y crea otra.') : null
        )
      );
      mount(zonaCategoria);
    } else {
      mount(
        zonaMedio,
        campo(
          'Medio',
          segmentado({
            opciones: MEDIOS.map((m) => ({ id: m, nombre: NOMBRE_MEDIO[m] })),
            valor: s.medio,
            etiqueta: 'Medio',
            clase: 'segmentado-ancho',
            alCambiar: (medio) => {
              s.medio = medio;
              dibujar();
            },
          })
        )
      );
      mount(
        zonaCategoria,
        campo(
          'Categoría',
          h(
            'div',
            { class: 'chips-envoltura', role: 'group', 'aria-label': 'Categoría' },
            categoriasDelTipo().map((c) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'chip',
                  'aria-pressed': String(!s.otra && s.categoria === c),
                  onClick: () => {
                    s.categoria = c;
                    s.otra = false;
                    dibujar();
                  },
                },
                c
              )
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'chip chip-otra',
                'aria-pressed': String(s.otra),
                onClick: () => {
                  s.otra = true;
                  dibujar();
                  inputOtra.focus();
                },
              },
              '+ Otra'
            )
          ),
          s.otra ? inputOtra : null
        )
      );
    }

    const ayer = sumarDias(hoy, -1);
    mount(
      zonaFecha,
      [
        ['Hoy', hoy],
        ['Ayer', ayer],
      ].map(([texto, fecha]) =>
        h(
          'button',
          {
            type: 'button',
            class: 'chip',
            'aria-pressed': String(inputFecha.value === fecha),
            onClick: () => {
              inputFecha.value = fecha;
              dibujar();
            },
          },
          texto
        )
      ),
      inputFecha
    );
  }

  inputFecha.addEventListener('change', dibujar);

  function aviso(texto, fecha) {
    const { desde, hasta } = rangoPeriodo(ctx.estado.periodo.tipo, ctx.estado.periodo.ref);
    mostrarAviso(fecha < desde || fecha > hasta ? `${texto} (fuera del periodo que estás viendo)` : texto);
  }

  function guardar(e) {
    e.preventDefault();
    error.textContent = '';
    const monto = parsearMonto(inputMonto.value);
    const fecha = inputFecha.value;
    const nota = inputNota.value.trim();
    if (!(monto > 0)) return (error.textContent = 'Ingresa un monto mayor que 0.');
    if (!esFecha(fecha)) return (error.textContent = 'Elige una fecha válida.');

    try {
      if (s.tipo === 'transferencia') {
        if (esTransfer) {
          ctx.datos.actualizarTransferencia(mov.transferId, { monto, fecha, nota }).catch(mostrarError);
        } else {
          ctx.datos.crearTransferencia({ origen: s.origen, destino: otroMedio(s.origen), monto, fecha, nota }).listo.catch(mostrarError);
        }
        hoja.cerrar();
        return aviso(esTransfer ? 'Transferencia actualizada' : 'Transferencia registrada', fecha);
      }

      const categoria = s.otra ? inputOtra.value.trim() : s.categoria;
      if (!categoria) return (error.textContent = s.otra ? 'Escribe el nombre de la categoría.' : 'Elige una categoría.');
      const datos = { tipo: s.tipo, medio: s.medio, monto, fecha, nota, categoria };
      const lista = s.tipo === 'ingreso' ? config.categoriasIngreso : config.categoriasGasto;
      if (editando) ctx.datos.actualizarMovimiento(mov, datos).catch(mostrarError);
      else ctx.datos.crearMovimiento(datos).listo.catch(mostrarError);
      if (s.otra && !lista.includes(categoria)) ctx.datos.guardarCategorias(s.tipo, [...lista, categoria]).catch(mostrarError);
      hoja.cerrar();
      aviso(editando ? 'Cambios guardados' : s.tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado', fecha);
    } catch (err) {
      if (err.code !== 'app/validacion') throw err;
      error.textContent = err.message;
    }
  }

  async function eliminar() {
    hoja.cerrar();
    try {
      const { borrados, listo } = await ctx.datos.eliminarMovimiento(mov);
      listo.catch(mostrarError);
      mostrarAviso(borrados.length > 1 ? 'Transferencia eliminada' : 'Movimiento eliminado', {
        accion: 'Deshacer',
        alAccion: () => ctx.datos.restaurarMovimientos(borrados).catch(mostrarError),
      });
    } catch (err) {
      mostrarError(err);
    }
  }

  dibujar();

  const formulario = h(
    'form',
    { class: 'form-mov', novalidate: true, onSubmit: guardar },
    zonaTipo,
    h('label', { class: 'monto-envoltura' }, h('span', { class: 'monto-prefijo cifra' }, 'S/'), inputMonto),
    zonaMedio,
    zonaCategoria,
    campo('Fecha', zonaFecha),
    inputNota,
    error,
    h(
      'div',
      { class: 'form-acciones' },
      editando ? h('button', { type: 'button', class: 'boton boton-peligro', onClick: eliminar }, 'Eliminar') : null,
      h('button', { type: 'submit', class: 'boton boton-primario' }, 'Guardar')
    )
  );

  const titulo = esTransfer ? 'Editar transferencia' : editando ? 'Editar movimiento' : 'Nuevo movimiento';
  const hoja = abrirHoja({ titulo, contenido: formulario });
  if (!editando) inputMonto.focus();
  return hoja;
}
