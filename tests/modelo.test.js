process.env.TZ = 'America/Lima';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ahorradoEnMeta,
  efectoCentimos,
  esFecha,
  fechaLocal,
  normalizarConfig,
  parsearMonto,
  validarMeta,
  validarMovimiento,
} from '../src/modelo.js';

test('fechaLocal no se adelanta de noche en Perú', () => {
  const nocheDel27 = new Date(2026, 8, 27, 23, 30);
  assert.equal(nocheDel27.toISOString().slice(0, 10), '2026-09-28');
  assert.equal(fechaLocal(nocheDel27), '2026-09-27');
});

test('esFecha exige YYYY-MM-DD y días reales', () => {
  assert.ok(esFecha('2026-09-27'));
  assert.ok(esFecha('2028-02-29'));
  assert.ok(!esFecha('2026-02-30'));
  assert.ok(!esFecha('2026-9-27'));
  assert.ok(!esFecha('27/09/2026'));
  assert.ok(!esFecha(''));
});

test('parsearMonto acepta coma o punto y redondea a céntimos', () => {
  assert.equal(parsearMonto('12,50'), 12.5);
  assert.equal(parsearMonto('12.5'), 12.5);
  assert.equal(parsearMonto(' 1 200,555 '), 1200.56);
  assert.equal(parsearMonto('0.1'), 0.1);
  assert.ok(Number.isNaN(parsearMonto('')));
  assert.ok(Number.isNaN(parsearMonto('-5')));
  assert.ok(Number.isNaN(parsearMonto('abc')));
});

test('validarMovimiento', () => {
  const ok = { tipo: 'gasto', medio: 'digital', monto: 12.5, fecha: '2026-09-27', categoria: 'Almuerzos', nota: '' };
  assert.equal(validarMovimiento(ok), null);
  assert.ok(validarMovimiento({ ...ok, tipo: 'otro' }));
  assert.ok(validarMovimiento({ ...ok, medio: 'tarjeta' }));
  assert.ok(validarMovimiento({ ...ok, monto: 0 }));
  assert.ok(validarMovimiento({ ...ok, monto: -3 }));
  assert.ok(validarMovimiento({ ...ok, monto: '12' }));
  assert.ok(validarMovimiento({ ...ok, fecha: '2026-13-01' }));
  assert.ok(validarMovimiento({ ...ok, categoria: '  ' }));
});

test('validarMeta', () => {
  assert.equal(validarMeta({ nombre: 'Laptop', objetivo: 3200, limite: '' }), null);
  assert.equal(validarMeta({ nombre: 'Laptop', objetivo: 3200, limite: '2027-05-28' }), null);
  assert.ok(validarMeta({ nombre: 'Laptop', objetivo: 0 }));
  assert.ok(validarMeta({ nombre: '', objetivo: 10 }));
  assert.ok(validarMeta({ nombre: 'Laptop', objetivo: 10, limite: 'mañana' }));
});

test('efectoCentimos evita errores de coma flotante', () => {
  const total = [0.1, 0.2].reduce((s, monto) => s + efectoCentimos({ tipo: 'ingreso', monto }), 0);
  assert.equal(total, 30);
  assert.equal(efectoCentimos({ tipo: 'gasto', monto: 12.5 }), -1250);
});

test('ahorradoEnMeta suma aportes y resta retiros', () => {
  assert.equal(ahorradoEnMeta({ aportes: [{ monto: 850 }, { monto: 100.1 }, { monto: -50 }] }), 900.1);
  assert.equal(ahorradoEnMeta({}), 0);
});

test('normalizarConfig completa lo que falta', () => {
  const c = normalizarConfig({ presupuestos: { digital: { Almuerzos: 200 } }, saldosCent: { efectivo: 500 } });
  assert.equal(c.categoriasGasto.length, 5);
  assert.deepEqual(c.presupuestos, { digital: { Almuerzos: 200 }, efectivo: {} });
  assert.deepEqual(c.saldosCent, { digital: 0, efectivo: 500 });
  assert.deepEqual(normalizarConfig(undefined).saldosCent, { digital: 0, efectivo: 0 });
});
