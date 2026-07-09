export function sumNumbers(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
