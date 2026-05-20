type CaseCustomerInfo = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  zipCode?: string | null;
  city?: string | null;
  country?: string | null;
};

function joinName(input: CaseCustomerInfo) {
  return [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
}

function joinStreet(input: CaseCustomerInfo) {
  return [input.street, input.houseNumber].filter(Boolean).join(' ').trim();
}

function joinCity(input: CaseCustomerInfo) {
  return [input.zipCode, input.city].filter(Boolean).join(' ').trim();
}

function InfoRow(props: { label: string; value?: string | null }) {
  const { label, value } = props;

  if (!value || !value.trim()) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1 rounded-xl border border-black/5 bg-neutral-50 p-3'>
      <div className='text-xs font-medium tracking-wide text-neutral-500 uppercase'>
        {label}
      </div>
      <div className='text-sm text-neutral-900'>{value}</div>
    </div>
  );
}

export default function CaseCustomerInfoCard(props: {
  customer: CaseCustomerInfo | null | undefined;
}) {
  const { customer } = props;

  if (!customer) {
    return (
      <section className='rounded-2xl border bg-white p-6 shadow-sm'>
        <div className='mb-3'>
          <h2 className='text-lg font-semibold'>Kundeninformationen</h2>
          <p className='text-sm text-neutral-600'>
            Keine Kundendaten verfügbar.
          </p>
        </div>
      </section>
    );
  }

  const fullName = joinName(customer);
  const streetLine = joinStreet(customer);
  const cityLine = joinCity(customer);

  return (
    <section className='rounded-2xl border bg-white p-6 shadow-sm'>
      <div className='mb-4'>
        <h2 className='text-lg font-semibold'>Kundeninformationen</h2>
        <p className='text-sm text-neutral-600'>
          Kontaktdaten und Anschrift des Kunden.
        </p>
      </div>

      <div className='grid gap-3 md:grid-cols-2'>
        <InfoRow label='Name' value={fullName} />
        <InfoRow label='E-Mail' value={customer.email} />
        <InfoRow label='Telefon' value={customer.phone} />
        <InfoRow label='Straße' value={streetLine} />
        <InfoRow label='PLZ / Ort' value={cityLine} />
        <InfoRow label='Land' value={customer.country} />
      </div>
    </section>
  );
}
