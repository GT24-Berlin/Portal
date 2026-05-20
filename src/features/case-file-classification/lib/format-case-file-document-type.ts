export function formatCaseFileDocumentType(value: string | null | undefined) {
  switch (value) {
    case 'GUTACHTEN_MAIN':
      return 'Hauptgutachten';
    case 'GUTACHTEN_ANLAGE_FOTOS':
      return 'Lichtbildanlage';
    case 'GUTACHTEN_MINDERWERTREPORT':
      return 'Minderwertreport';
    case 'GUTACHTEN_AUFTRAG':
      return 'Auftragsbestätigung';
    case 'RECHNUNG':
      return 'Rechnung';
    case 'ACHSVERMESSUNG':
      return 'Achsvermessung';
    case 'VERSICHERUNGSDOKUMENT':
      return 'Versicherungsdokument';
    case 'FAHRZEUGDOKUMENT':
      return 'Fahrzeugdokument';
    case 'SONSTIGES':
      return 'Sonstiges';
    default:
      return 'Unklassifiziert';
  }
}
