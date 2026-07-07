/** Convert feet + inches + optional eighths (blueprint style) to decimal feet. */
export function archFt(feet: number, inches = 0, eighths = 0): number {
  return feet + (inches + eighths / 8) / 12;
}

/** Convert decimal feet to feet + inches (inches may include fractional part, e.g. 1.125 = 1 1/8"). */
export function feetToFeetInches(totalFeet: number): { feet: number; inches: number } {
  const safe = Number.isFinite(totalFeet) ? Math.max(0, totalFeet) : 0;
  const totalInches = safe * 12;
  const feet = Math.floor(totalInches / 12 + 1e-9);
  const inches = totalInches - feet * 12;
  return { feet, inches: inches > 1e-9 ? inches : 0 };
}

const EIGHTH_LABELS: Record<number, string> = {
  1: '1/8',
  2: '1/4',
  3: '3/8',
  4: '1/2',
  5: '5/8',
  6: '3/4',
  7: '7/8',
};

function formatInchesArchitectural(inches: number): string {
  if (inches < 1 / 128) return '0';
  const whole = Math.floor(inches + 1 / 128);
  const frac = inches - whole;
  const eighths = Math.round(frac * 8);
  const fracLabel = eighths > 0 && eighths < 8 ? EIGHTH_LABELS[eighths] : '';
  if (whole === 0 && fracLabel) return fracLabel;
  if (fracLabel) return `${whole} ${fracLabel}`;
  return String(whole);
}

/** Display e.g. 12' 6 1/2" or 12' when even feet. */
export function formatFeetInches(totalFeet: number): string {
  const { feet, inches } = feetToFeetInches(totalFeet);
  if (inches < 1 / 128) return `${feet}'`;
  return `${feet}' ${formatInchesArchitectural(inches)}"`;
}

export function formatFeetInchesPair(aFt: number, bFt: number): string {
  return `${formatFeetInches(aFt)} × ${formatFeetInches(bFt)}`;
}

export function formatFeetInchesTriple(wFt: number, dFt: number, hFt: number): string {
  return `${formatFeetInches(wFt)} × ${formatFeetInches(dFt)} × ${formatFeetInches(hFt)}`;
}

/** Display a length given in inches (catalog SKUs, etc.). */
export function formatInchesValue(inches: number): string {
  if (Math.abs(inches - Math.round(inches)) < 1 / 128) return String(Math.round(inches));
  const feet = Math.floor(inches / 12 + 1e-9);
  const rem = inches - feet * 12;
  if (feet === 0) return formatInchesArchitectural(rem);
  const remStr = rem >= 1 / 128 ? ` ${formatInchesArchitectural(rem)}` : '';
  return `${feet}'${remStr}"`;
}

/** Convert feet + inches fields to decimal feet (canonical storage). */
export function feetInchesToFeet(feet: number, inches: number): number {
  return feet + inches / 12;
}

export function parseFeetInchesInput(
  feetStr: string,
  inchesStr: string,
): number | null {
  const feet = feetStr.trim() === '' ? 0 : Number(feetStr);
  const inches = inchesStr.trim() === '' ? 0 : Number(inchesStr);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
  if (feet < 0 || inches < 0 || inches >= 12) return null;
  return feetInchesToFeet(feet, inches);
}

/** Snap layout coordinates to 1" increments (no 0.5' rounding). */
export function snapLayoutFt(value: number): number {
  return Math.max(0, Math.round(value * 12) / 12);
}
