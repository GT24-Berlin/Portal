import CasePhotoGalleryClient from './case-photo-gallery-client';

type CasePhotoItem = {
  id: string;
  title?: string | null;
  filename: string;
  mimeType?: string | null;
  createdAt: Date | string;
};

export default function CasePhotoGallery(props: {
  caseId: string;
  items: CasePhotoItem[];
}) {
  return <CasePhotoGalleryClient caseId={props.caseId} items={props.items} />;
}
