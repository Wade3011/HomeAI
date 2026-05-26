/** Convert feet + inches to decimal feet (canonical storage). */
export function feetInchesToFeet(feet: number, inches: number): number {
  return feet + inches / 12;
}

/** Split decimal feet into whole feet and inches (inches to 0.1"). */
export function feetToFeetInches(totalFeet: number): { feet: number; inches: number } {
  const safe = Number.isFinite(totalFeet) ? Math.max(0, totalFeet) : 0;
  let feet = Math.floor(safe + 1e-9);
  let inches = Math.round((safe - feet) * 12 * 10) / 10;
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

function formatInches(inches: number): string {
  if (Math.abs(inches) < 0.05) return '0';
  return Number.isInteger(inches) ? String(inches) : inches.toFixed(1).replace(/\.0$/, '');
}

/** Display e.g. 12' 9.5" or 12' when even feet. */
export function formatFeetInches(totalFeet: number): string {
  const { feet, inches } = feetToFeetInches(totalFeet);
  if (inches < 0.05) return `${feet}'`;
  return `${feet}' ${formatInches(inches)}"`;
}

export function formatFeetInchesPair(aFt: number, bFt: number): string {
  return `${formatFeetInches(aFt)} × ${formatFeetInches(bFt)}`;
}

export function formatFeetInchesTriple(wFt: number, dFt: number, hFt: number): string {
  return `${formatFeetInches(wFt)} × ${formatFeetInches(dFt)} × ${formatFeetInches(hFt)}`;
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
