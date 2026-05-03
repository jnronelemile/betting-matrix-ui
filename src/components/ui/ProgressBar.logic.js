export function calculatePercentage(value, max = 1) {
  if (max === 0) return 0;
  const percentage = (value / max) * 100;
  return Math.min(Math.max(percentage, 0), 100);
}
