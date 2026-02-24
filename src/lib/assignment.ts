export type AssignmentRole = 'GUTACHTER' | 'ANWALT';

export function parseAssignmentRole(input: unknown): AssignmentRole | null {
  const v = String(input ?? '').toUpperCase();
  if (v === 'GUTACHTER' || v === 'ANWALT') return v;
  return null;
}
