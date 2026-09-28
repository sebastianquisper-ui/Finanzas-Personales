import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { crearDatos } from '../src/datos.js';
import { normalizarConfig } from '../src/modelo.js';

let env;
let db;
let datos;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-finanzas',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  db = env.authenticatedContext('ana').firestore();
  datos = crearDatos(db, 'ana');
});

async function config() {
  return normalizarConfig((await getDoc(doc(db, 'users/ana/config/main'))).data());
}

async function movimientos() {
  const snap = await getDocs(collection(db, 'users/ana/movimientos'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function leerRango(desde, hasta) {
  return new Promise((resolve, reject) => {
    const cancelar = datos.escucharMovimientos(desde, hasta, (movs) => {
      cancelar();
      resolve(movs);
    }, reject);
  });
}

const gasto = { tipo: 'gasto', categoria: 'Almuerzos', monto: 12.5, fecha: '2026-09-27', medio: 'digital' };

describe('movimientos y saldos', () => {
  test('crear gastos e ingresos ajusta el saldo de su billetera', async () => {
    await datos.crearMovimiento({ ...gasto, monto: 0.1 }).listo;
    await datos.crearMovimiento({ ...gasto, monto: 0.2 }).listo;
    await datos.crearMovimiento({ tipo: 'ingreso', categoria: 'Sueldo', monto: 100, fecha: '2026-09-01', medio: 'efectivo' }).listo;
    assert.deepEqual((await config()).saldosCent, { digital: -30, efectivo: 10000 });
  });

  test('editar recalcula el saldo, incluso si cambia de medio', async () => {
    const { id } = datos.crearMovimiento(gasto);
    await datos.crearMovimiento({ ...gasto, monto: 1 }).listo;
    const anterior = (await movimientos()).find((m) => m.id === id);
    await datos.actualizarMovimiento(anterior, { monto: 20, medio: 'efectivo', nota: ' pollo ' });
    const editado = (await movimientos()).find((m) => m.id === id);
    assert.equal(editado.monto, 20);
    assert.equal(editado.nota, 'pollo');
    assert.equal(editado.creado, anterior.creado);
    assert.deepEqual((await config()).saldosCent, { digital: -100, efectivo: -2000 });
  });

  test('eliminar y deshacer deja todo como estaba', async () => {
    const { id } = datos.crearMovimiento(gasto);
    await datos.crearMovimiento({ ...gasto, monto: 5 }).listo;
    const mov = (await movimientos()).find((m) => m.id === id);
    const { borrados, listo } = await datos.eliminarMovimiento(mov);
    await listo;
    assert.equal((await movimientos()).length, 1);
    assert.equal((await config()).saldosCent.digital, -500);
    await datos.restaurarMovimientos(borrados);
    assert.deepEqual((await movimientos()).find((m) => m.id === id), mov);
    assert.equal((await config()).saldosCent.digital, -1750);
  });

  test('rechaza movimientos inválidos antes de escribir', () => {
    assert.throws(() => datos.crearMovimiento({ ...gasto, monto: 0 }), /monto/);
    assert.throws(() => datos.crearMovimiento({ ...gasto, fecha: '2026-02-30' }), /Fecha/);
  });

  test('la consulta por rango trae solo el periodo', async () => {
    await datos.crearMovimiento({ ...gasto, fecha: '2026-08-31' }).listo;
    await datos.crearMovimiento({ ...gasto, fecha: '2026-09-01' }).listo;
    await datos.crearMovimiento({ ...gasto, fecha: '2026-09-30' }).listo;
    await datos.crearMovimiento({ ...gasto, fecha: '2026-10-01' }).listo;
    const sep = await leerRango('2026-09-01', '2026-09-30');
    assert.deepEqual(sep.map((m) => m.fecha), ['2026-09-30', '2026-09-01']);
  });

  test('recalcularSaldos coincide con los incrementos', async () => {
    await datos.crearMovimiento(gasto).listo;
    await datos.crearMovimiento({ tipo: 'ingreso', categoria: 'Venta', monto: 40.4, fecha: '2026-09-02', medio: 'efectivo' }).listo;
    await datos.crearTransferencia({ origen: 'efectivo', destino: 'digital', monto: 10, fecha: '2026-09-03' }).listo;
    const incrementales = (await config()).saldosCent;
    assert.deepEqual(await datos.recalcularSaldos(), incrementales);
    assert.deepEqual(incrementales, { digital: -250, efectivo: 3040 });
  });
});

describe('transferencias', () => {
  test('crea dos patas enlazadas y mueve el saldo entre billeteras', async () => {
    const { transferId, listo } = datos.crearTransferencia({ origen: 'digital', destino: 'efectivo', monto: 50, fecha: '2026-09-27', nota: 'cajero' });
    await listo;
    const patas = await movimientos();
    assert.equal(patas.length, 2);
    assert.ok(patas.every((p) => p.transferId === transferId && p.categoria === 'Transferencia' && p.nota === 'cajero'));
    assert.deepEqual(patas.map((p) => `${p.tipo}:${p.medio}`).sort(), ['gasto:digital', 'ingreso:efectivo']);
    assert.deepEqual((await config()).saldosCent, { digital: -5000, efectivo: 5000 });
  });

  test('editar actualiza ambas patas; eliminar una borra las dos', async () => {
    const { transferId, listo } = datos.crearTransferencia({ origen: 'digital', destino: 'efectivo', monto: 50, fecha: '2026-09-27' });
    await listo;
    await datos.crearMovimiento(gasto).listo;
    await datos.actualizarTransferencia(transferId, { monto: 80, fecha: '2026-09-26', nota: 'corregido' });
    const patas = (await movimientos()).filter((m) => m.transferId);
    assert.ok(patas.every((p) => p.monto === 80 && p.fecha === '2026-09-26' && p.nota === 'corregido'));
    assert.deepEqual((await config()).saldosCent, { digital: -9250, efectivo: 8000 });

    const { borrados, listo: borrado } = await datos.eliminarMovimiento(patas[0]);
    await borrado;
    assert.equal(borrados.length, 2);
    assert.equal((await movimientos()).length, 1);
    assert.deepEqual((await config()).saldosCent, { digital: -1250, efectivo: 0 });
  });

  test('no permite transferir a la misma billetera', () => {
    assert.throws(() => datos.crearTransferencia({ origen: 'digital', destino: 'digital', monto: 5, fecha: '2026-09-27' }));
  });
});

describe('configuración', () => {
  test('agregar una categoría conserva las de por defecto', async () => {
    const actuales = (await config()).categoriasGasto;
    await datos.guardarCategorias('gasto', [...actuales, ' Gimnasio ', 'Almuerzos']);
    const cfg = await config();
    assert.deepEqual(cfg.categoriasGasto, ['ComerRico', 'Almuerzos', 'Tecnología', 'Pasajes', 'Extras', 'Gimnasio']);
    assert.equal(cfg.categoriasIngreso.length, 4);
  });

  test('presupuestos por medio, con tildes y puntos en el nombre, y borrado con 0', async () => {
    await datos.definirPresupuesto('digital', 'Tecnología', 300);
    await datos.definirPresupuesto('digital', 'Cine.y.más', 50);
    await datos.definirPresupuesto('efectivo', 'Pasajes', 80);
    await datos.definirPresupuesto('digital', 'Cine.y.más', 0);
    assert.deepEqual((await config()).presupuestos, { digital: { Tecnología: 300 }, efectivo: { Pasajes: 80 } });
  });
});

describe('metas', () => {
  test('aportes y retiros sin tocar los saldos de las billeteras', async () => {
    const { id, listo } = datos.crearMeta({ nombre: 'Laptop nueva', objetivo: 3200, limite: '2027-05-28' });
    await listo;
    const leer = async () => ({ id, ...(await getDoc(doc(db, 'users/ana/metas', id))).data() });
    await datos.aportarAMeta(await leer(), 850, '2026-09-23');
    await datos.aportarAMeta(await leer(), -50, '2026-09-24');
    const meta = await leer();
    assert.deepEqual(meta.aportes.map((a) => a.monto), [850, -50]);
    assert.throws(() => datos.aportarAMeta(meta, -801, '2026-09-25'), /retirar más/);
    assert.equal((await getDoc(doc(db, 'users/ana/config/main'))).exists(), false);
  });

  test('eliminar y restaurar una meta conserva sus aportes', async () => {
    const { id, listo } = datos.crearMeta({ nombre: 'Viaje', objetivo: 1500 });
    await listo;
    const leer = async () => (await getDoc(doc(db, 'users/ana/metas', id))).data();
    await datos.aportarAMeta({ id, ...(await leer()) }, 200, '2026-09-10');
    const meta = { id, ...(await leer()) };
    await datos.eliminarMeta(meta);
    assert.equal((await getDoc(doc(db, 'users/ana/metas', id))).exists(), false);
    await datos.restaurarMeta(meta);
    assert.deepEqual({ id, ...(await leer()) }, meta);
  });

  test('lectura puntual por rango', async () => {
    await datos.crearMovimiento({ ...gasto, fecha: '2026-08-15' }).listo;
    await datos.crearMovimiento({ ...gasto, fecha: '2026-09-15' }).listo;
    assert.deepEqual((await datos.movimientosEntre('2026-08-01', '2026-08-31')).map((m) => m.fecha), ['2026-08-15']);
  });

  test('valida objetivo y fecha límite', () => {
    assert.throws(() => datos.crearMeta({ nombre: 'X', objetivo: 0 }));
    assert.throws(() => datos.crearMeta({ nombre: 'X', objetivo: 10, limite: '2027-02-30' }));
  });
});
