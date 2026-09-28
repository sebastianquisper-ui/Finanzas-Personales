const numero = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "S/ 1,234.50"; con signo: "+S/ 20.00" / "−S/ 12.50".
export function soles(monto, { signo = false } = {}) {
  const texto = `S/ ${numero.format(Math.abs(monto))}`;
  if (monto < 0) return `−${texto}`;
  if (signo && monto > 0) return `+${texto}`;
  return texto;
}

export function porcentaje(parte, total) {
  if (!total) return '0 %';
  return `${Math.round((parte / total) * 100)} %`;
}

export const NOMBRE_MEDIO = { digital: 'Digital', efectivo: 'Efectivo' };
