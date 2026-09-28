import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { soles, porcentaje } from '../formato.js';
import { esOscuro, montosOcultos } from '../tema.js';

Chart.register(DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip);

// Paleta de categorías del diseño original, en orden fijo. En oscuro, oro/verde/rojo usan
// los tonos del tema oscuro. Con 5 categorías pasa la prueba de daltonismo en claro; más
// allá se apoya en la leyenda con nombre, monto y % (siempre visible).
const PALETA = ['#C99A2E', '#2F7A55', '#7A6BB0', '#B3452D', '#8C9A8E', '#4C8AA6', '#9B6B43', '#6B8E4E', '#B0578D', '#5F7391'];
const EN_OSCURO = { '#C99A2E': '#E0B348', '#2F7A55': '#4FA57A', '#B3452D': '#E0806A' };
const MAX_PORCIONES = 7;

// Se recrean en cada actualización de datos, así que van sin animación para no parpadear.
let activos = [];

export function destruirGraficos() {
  for (const g of activos) g.destroy();
  activos = [];
}

function css(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function colorPorIndice(i) {
  const color = PALETA[i];
  return esOscuro() ? (EN_OSCURO[color] ?? color) : color;
}

// El color sigue a la categoría (su posición en la configuración), no a su puesto en el ranking.
// Las que no tienen color propio o pasan del máximo de porciones se agrupan en "Otras".
export function porcionesDona(porCategoria, categoriasGasto) {
  const porciones = [];
  let otras = 0;
  for (const { categoria, total } of porCategoria) {
    const i = categoriasGasto.indexOf(categoria);
    if (i >= 0 && i < PALETA.length && porciones.length < MAX_PORCIONES - 1) {
      porciones.push({ categoria, total, color: colorPorIndice(i) });
    } else {
      otras += total;
    }
  }
  if (otras > 0) porciones.push({ categoria: null, etiqueta: 'Otras', total: Math.round(otras * 100) / 100, color: css('--ink-soft') });
  return porciones;
}

function tooltipBase() {
  return {
    enabled: !montosOcultos(),
    backgroundColor: css('--ink'),
    titleColor: css('--paper'),
    bodyColor: css('--paper'),
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
    titleFont: { family: 'IBM Plex Sans', weight: '600' },
    bodyFont: { family: 'IBM Plex Sans' },
  };
}

export function graficoDona(canvas, porciones) {
  const total = porciones.reduce((s, p) => s + p.total, 0);
  const grafico = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: porciones.map((p) => p.etiqueta ?? p.categoria),
      datasets: [
        {
          data: porciones.map((p) => p.total),
          backgroundColor: porciones.map((p) => p.color),
          borderColor: css('--card'),
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        tooltip: {
          ...tooltipBase(),
          callbacks: { label: (c) => ` ${soles(c.parsed)} · ${porcentaje(c.parsed, total)}` },
        },
      },
    },
  });
  activos.push(grafico);
  return grafico;
}

export function graficoTendencia(canvas, grupos, { ingresos, gastos }) {
  const grafico = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: grupos.map((g) => g.etiqueta),
      datasets: [
        { label: 'Ingresos', data: ingresos, backgroundColor: css('--green') },
        { label: 'Gastos', data: gastos, backgroundColor: css('--red') },
      ].map((d) => ({ ...d, borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 14, categoryPercentage: 0.7, barPercentage: 0.9 })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          border: { color: css('--line') },
          ticks: { color: css('--ink-soft'), font: { family: 'IBM Plex Sans', size: 11 }, maxRotation: 0, autoSkipPadding: 6 },
        },
        y: {
          beginAtZero: true,
          grid: { color: css('--line'), drawTicks: false },
          border: { display: false },
          ticks: {
            color: css('--ink-soft'),
            font: { family: 'IBM Plex Sans', size: 11 },
            maxTicksLimit: 4,
            padding: 6,
            callback: (v) => (montosOcultos() ? '' : compacto(v)),
          },
        },
      },
      plugins: {
        tooltip: {
          ...tooltipBase(),
          callbacks: { label: (c) => ` ${c.dataset.label}: ${soles(c.parsed.y)}` },
        },
      },
    },
  });
  activos.push(grafico);
  return grafico;
}

function compacto(v) {
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
  return String(v);
}
