export function formatCaseFileClassificationConfidence(
  value: string | null | undefined
) {
  switch (value) {
    case 'HIGH':
      return 'hoch';
    case 'MEDIUM':
      return 'mittel';
    case 'LOW':
      return 'niedrig';
    default:
      return null;
  }
}
