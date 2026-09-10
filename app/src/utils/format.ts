export function usd(n: number, decimals = 2): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function jpy(n: number): string {
  return `¥${Math.round(n).toLocaleString('en-US')}`;
}
