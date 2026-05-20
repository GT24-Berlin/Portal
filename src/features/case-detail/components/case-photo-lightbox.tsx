'use client';

type CasePhotoLightboxProps = {
  open: boolean;
  imageUrl: string | null;
  title?: string | null;
  onClose: () => void;
};

export default function CasePhotoLightbox(props: CasePhotoLightboxProps) {
  const { open, imageUrl, title, onClose } = props;

  if (!open || !imageUrl) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'>
      <div className='relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl'>
        <button
          type='button'
          onClick={onClose}
          className='absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-lg font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50'
          aria-label='Bild schließen'
        >
          ×
        </button>

        <div className='bg-neutral-100'>
          <img
            src={imageUrl}
            alt={title ?? 'Schadenfoto'}
            className='max-h-[80vh] w-full object-contain'
          />
        </div>

        {title ? (
          <div className='border-t px-5 py-4 text-sm text-neutral-700'>
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
}
