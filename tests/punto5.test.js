process.env.TZ = 'America/Lima';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertas, avisoTrasGasto, estadoPresupuesto, nivel } from '../src/presupuesto.js';
import { mesesHasta, progresoMeta } from '../src/metas.js';
import { compararPeriodos } from '../src/resumen.js';
import { normalizarConfig } from '../src/modelo.js';

const config = normalizarConfig({
  presupuestos: { digital: { Almuerzos: 100, Pasajes: 10, Extras: 50 }, efectivo: { Almuerzos: 20 } },
});
const mes = [
  { id: 'a', tipo: 'gasto', categoria: 'Almuerzos', monto: 69.99, fecha: '2026-09-02', medio: 'digital' },
  { id: 'b', tipo: 'gasto', categoria: 'Pasajes', monto: 10, fecha: '2026-09-03', medio: 'digital' },
  { id: 'c', tipo: 'gasto', categoria: 'Extras', monto: 35, fecha: '2026-09-03', medio: 'digital' },
  { id: 'd', tipo: 'gasto', categoria: 'Almuerzos', monto: 5, fecha: '2026-09-03', medio: 'efectivo' },
  { id: 'e', tipo: 'gasto', categoria: 'Gimnasio', monto: 80, fecha: '2026-09-05', medio: 'digital' },
  { id: 't', tipo: 'gasto', categoria: 'Transferencia', monto: 500, fecha: '2026-09-05', medio: 'digital', transferId: 'T' },
];

test('niveles: verde < 70 %, ámbar 70–99 %, rojo desde 100 %', () => {
  assert.equal(nivel(69.99, 100), 'ok');
  assert.equal(nivel(70, 100), 'alerta');
  assert.equal(nivel(99.99, 100), 'alerta');
  assert.equal(nivel(100, 100), 'excedido');
  assert.equal(nivel(5, null), null);
});

test('estado del presupuesto por medio, sin transferencias', () => {
  const e = estadoPresupuesto(mes, config, 'digital');
  const fila = (c) => e.filas.find((f) => f.categoria === c);
  assert.deepEqual(fila('Almuerzos'), { categoria: 'Almuerzos', gastado: 69.99, tope: 100, nivel: 'ok', restante: 30.01 });
  assert.equal(fila('Pasajes').nivel, 'excedido');
  assert.equal(fila('Pasajes').restante, 0);
  assert.equal(fila('Extras').nivel, 'alerta');
  assert.equal(fila('Gimnasio').tope, null);
  assert.equal(fila('Transferencia'), undefined);
  assert.deepEqual(e.total, { gastado: 114.99, tope: 160, nivel: 'alerta', restante: 45.01 });
  assert.deepEqual(alertas(e).map((f) => f.categoria), ['Pasajes', 'Extras']);
  assert.equal(estadoPresupuesto(mes, config, 'efectivo').filas.find((f) => f.categoria === 'Almuerzos').gastado, 5);
});

test('aviso al guardar un gasto que cruza el 70 % o el 100 %', () => {
  const nuevo = { tipo: 'gasto', categoria: 'Almuerzos', monto: 0.01, medio: 'digital' };
  assert.deepEqual(avisoTrasGasto(mes, config, nuevo), { categoria: 'Almuerzos', gastado: 70, tope: 100, nivel: 'alerta', pct: 70 });
  assert.equal(avisoTrasGasto(mes, config, { ...nuevo, monto: 30.01 }).nivel, 'excedido');
  assert.equal(avisoTrasGasto(mes, config, { ...nuevo, medio: 'efectivo' }), null);
  assert.equal(avisoTrasGasto(mes, config, { ...nuevo, categoria: 'Gimnasio' }), null);
  assert.equal(avisoTrasGasto(mes, config, { ...nuevo, tipo: 'ingreso' }), null);
  // Al editar, el monto anterior no se cuenta dos veces.
  assert.equal(avisoTrasGasto(mes, config, { ...nuevo, monto: 60 }, mes[0]), null);
  assert.equal(avisoTrasGasto(mes, config, { ...nuevo, monto: 70 }, mes[0]).pct, 70);
});

test('comparar dos periodos', () => {
  const b = [
    { tipo: 'gasto', categoria: 'Almuerzos', monto: 50, medio: 'digital' },
    { tipo: 'gasto', categoria: 'ComerRico', monto: 20, medio: 'digital' },
    { tipo: 'ingreso', categoria: 'Sueldo', monto: 1000, medio: 'digital' },
  ];
  const r = compararPeriodos(mes.filter((m) => m.medio === 'digital'), b);
  assert.deepEqual(r.a, { ingresos: 0, gastos: 194.99, balance: -194.99 });
  assert.deepEqual(r.b, { ingresos: 1000, gastos: 70, balance: 930 });
  assert.equal(r.difGasto, 124.99);
  assert.deepEqual(r.porCategoria.map((c) => [c.categoria, c.dif]), [
    ['Gimnasio', 80],
    ['Extras', 35],
    ['ComerRico', -20],
    ['Almuerzos', 19.99],
    ['Pasajes', 10],
  ]);
});

test('meses hasta la fecha límite', () => {
  assert.equal(mesesHasta('2026-09-28', '2027-05-28'), 8);
  assert.equal(mesesHasta('2026-09-28', '2027-05-27'), 7);
  assert.equal(mesesHasta('2026-09-28', '2026-09-30'), 1);
  assert.equal(mesesHasta('2026-09-28', '2026-09-27'), 0);
});

test('progreso de metas: por mes, cumplida y vencida', () => {
  const meta = { objetivo: 3200, limite: '2027-05-28', aportes: [{ monto: 850 }, { monto: -50 }] };
  assert.deepEqual(progresoMeta(meta, '2026-09-28'), { ahorrado: 800, faltante: 2400, cumplida: false, pct: 0.25, porMes: 300, vencida: false });
  assert.equal(progresoMeta({ ...meta, limite: '' }, '2026-09-28').porMes, null);
  assert.equal(progresoMeta({ ...meta, limite: '2026-01-01' }, '2026-09-28').vencida, true);
  const cumplida = progresoMeta({ ...meta, aportes: [{ monto: 3300 }] }, '2026-09-28');
  assert.equal(cumplida.cumplida, true);
  assert.equal(cumplida.pct, 1);
  assert.equal(cumplida.porMes, null);
  assert.equal(progresoMeta({ objetivo: 100, limite: '2026-12-28', aportes: [] }, '2026-09-28').porMes, 33.34);
});
