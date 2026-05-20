import { formatCaseFileDocumentType } from '../lib/format-case-file-document-type';
import { formatCaseFileClassificationConfidence } from '../lib/format-case-file-classification-confidence';

export default function CaseFileDocumentBadge(props: {
  documentType?: string | null;
  classificationStatus?: string | null;
  classificationConfidence?: string | null;
}) {
  const { documentType, classificationStatus, classificationConfidence } =
    props;

  if (!documentType) {
    return null;
  }

  const label = formatCaseFileDocumentType(documentType);
  const confidence = formatCaseFileClassificationConfidence(
    classificationConfidence
  );

  const isMainGutachten =
    documentType === 'GUTACHTEN_MAIN' && classificationStatus === 'CLASSIFIED';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        isMainGutachten
          ? 'border-foreground/15 bg-foreground/5 text-foreground'
          : 'border-border bg-muted/40 text-muted-foreground'
      ].join(' ')}
    >
      {label}
      {confidence ? ` · ${confidence}` : ''}
    </span>
  );
}
