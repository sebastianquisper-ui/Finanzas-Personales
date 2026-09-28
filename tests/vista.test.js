process.env.TZ = 'America/Lima';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contieneHoy, etiquetaDia, etiquetaPeriodo, gruposTendencia, moverPeriodo, rangoPeriodo } from '../src/fechas.js';
import { agruparPorDia, filtrar, gastosPorCategoria, ordenarRecientes, tendencia, totales } from '../src/resumen.js';
import { porcentaje, soles } from '../src/formato.js';

const HOY = '2026-09-27'; // domingo

test('rangos de periodo; la semana empieza en lunes', () => {
  assert.deepEqual(rangoPeriodo('dia', HOY), { desde: HOY, hasta: HOY });
  assert.deepEqual(rangoPeriodo('semana', HOY), { desde: '2026-09-21', hasta: '2026-09-27' });
  assert.deepEqual(rangoPeriodo('semana', '2026-09-21'), { desde: '2026-09-21', hasta: '2026-09-27' });
  assert.deepEqual(rangoPeriodo('semana', '2026-12-31'), { desde: '2026-12-28', hasta: '2027-01-03' });
  assert.deepEqual(rangoPeriodo('mes', '2028-02-10'), { desde: '2028-02-01', hasta: '2028-02-29' });
  assert.deepEqual(rangoPeriodo('anio', HOY), { desde: '2026-01-01', hasta: '2026-12-31' });
});

test('mover periodos sin saltarse meses cortos', () => {
  assert.equal(moverPeriodo('dia', '2026-03-01', -1), '2026-02-28');
  assert.equal(moverPeriodo('semana', HOY, 1), '2026-10-04');
  assert.equal(moverPeriodo('mes', '2026-01-31', 1), '2026-02-01');
  assert.equal(moverPeriodo('mes', '2026-01-15', -1), '2025-12-01');
  assert.equal(moverPeriodo('anio', HOY, -1), '2025-01-01');
  assert.ok(contieneHoy('mes', '2026-09-01', HOY));
  assert.ok(!contieneHoy('mes', '2026-08-01', HOY));
});

test('etiquetas en español', () => {
  assert.equal(etiquetaDia(HOY, HOY), 'Hoy');
  assert.equal(etiquetaDia('2026-09-26', HOY), 'Ayer');
  assert.equal(etiquetaDia('2026-09-25', HOY), 'viernes 25 sep');
  assert.equal(etiquetaDia('2025-12-31', HOY), 'miércoles 31 dic 2025');
  assert.equal(etiquetaPeriodo('semana', HOY, HOY), 'Esta semana');
  assert.equal(etiquetaPeriodo('semana', '2026-09-14', HOY), '14 – 20 sep');
  assert.equal(etiquetaPeriodo('semana', '2026-09-30', '2026-10-20'), '28 sep – 4 oct');
  assert.equal(etiquetaPeriodo('mes', HOY, HOY), 'septiembre 2026');
  assert.equal(etiquetaPeriodo('anio', HOY, HOY), '2026');
});

test('grupos de tendencia', () => {
  assert.equal(gruposTendencia('dia', HOY), null);
  assert.deepEqual(gruposTendencia('semana', HOY).map((g) => g.etiqueta), ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']);
  assert.equal(gruposTendencia('mes', '2026-02-05').length, 28);
  const anio = gruposTendencia('anio', HOY);
  assert.equal(anio.length, 12);
  assert.deepEqual(anio[1], { etiqueta: 'feb', desde: '2026-02-01', hasta: '2026-02-28' });
});

const movs = [
  { id: 'a', tipo: 'gasto', categoria: 'Almuerzos', monto: 12.5, fecha: '2026-09-27', nota: 'Menú', medio: 'digital', creado: 3 },
  { id: 'b', tipo: 'gasto', categoria: 'Almuerzos', monto: 0.1, fecha: '2026-09-27', nota: '', medio: 'digital', creado: 5 },
  { id: 'c', tipo: 'gasto', categoria: 'Tecnología', monto: 0.2, fecha: '2026-09-26', nota: 'Cable USB', medio: 'digital', creado: 1 },
  { id: 'd', tipo: 'ingreso', categoria: 'Sueldo', monto: 2500, fecha: '2026-09-22', nota: '', medio: 'digital', creado: 1 },
  { id: 't1', tipo: 'gasto', categoria: 'Transferencia', monto: 100, fecha: '2026-09-27', nota: '', medio: 'digital', transferId: 'T', creado: 9 },
];

test('totales sin transferencias y sin errores de coma flotante', () => {
  assert.deepEqual(totales(movs), { ingresos: 2500, gastos: 12.8, balance: 2487.2 });
});

test('gastos por categoría ordenados', () => {
  assert.deepEqual(gastosPorCategoria(movs), [
    { categoria: 'Almuerzos', total: 12.6 },
    { categoria: 'Tecnología', total: 0.2 },
  ]);
});

test('tendencia por día de la semana', () => {
  const t = tendencia(movs, gruposTendencia('semana', HOY));
  assert.deepEqual(t.ingresos, [0, 2500, 0, 0, 0, 0, 0]);
  assert.deepEqual(t.gastos, [0, 0, 0, 0, 0, 0.2, 12.6]);
});

test('orden reciente y grupos por día con neto sin transferencias', () => {
  assert.deepEqual(ordenarRecientes(movs).map((m) => m.id), ['t1', 'b', 'a', 'c', 'd']);
  const dias = agruparPorDia(movs);
  assert.deepEqual(dias.map((d) => [d.fecha, d.neto, d.movs.length, d.soloTransferencias]), [
    ['2026-09-27', -12.6, 3, false],
    ['2026-09-26', -0.2, 1, false],
    ['2026-09-22', 2500, 1, false],
  ]);
});

test('filtros y búsqueda por nota, categoría (sin tildes) o monto', () => {
  assert.deepEqual(filtrar(movs, { tipo: 'gasto' }).map((m) => m.id), ['a', 'b', 'c']);
  assert.deepEqual(filtrar(movs, { categoria: 'Almuerzos' }).map((m) => m.id), ['a', 'b']);
  assert.deepEqual(filtrar(movs, { texto: 'tecnologia' }).map((m) => m.id), ['c']);
  assert.deepEqual(filtrar(movs, { texto: 'usb' }).map((m) => m.id), ['c']);
  assert.deepEqual(filtrar(movs, { texto: '12,5' }).map((m) => m.id), ['a']);
  assert.deepEqual(filtrar(movs, { tipo: 'ingreso', texto: '2500' }).map((m) => m.id), ['d']);
});

test('formato de soles', () => {
  assert.equal(soles(1234.5), 'S/ 1,234.50');
  assert.equal(soles(-12.5), '−S/ 12.50');
  assert.equal(soles(20, { signo: true }), '+S/ 20.00');
  assert.equal(soles(0, { signo: true }), 'S/ 0.00');
  assert.equal(porcentaje(1, 3), '33 %');
  assert.equal(porcentaje(1, 0), '0 %');
});

test('un día con solo transferencias no tiene neto', () => {
  const [dia] = agruparPorDia(movs.filter((m) => m.transferId));
  assert.equal(dia.soloTransferencias, true);
  assert.equal(dia.neto, 0);
});
