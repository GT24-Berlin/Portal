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
    <div className='border-border/60 bg-background/80 hover:bg-muted/20 flex flex-col gap-1 rounded-2xl border p-3 shadow-sm transition-colors'>
      <div className='text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase'>
        {label}
      </div>
      <div className='text-foreground text-sm'>{value}</div>
    </div>
  );
}

export default function CaseCustomerInfoCard(props: {
  customer: CaseCustomerInfo | null | undefined;
}) {
  const { customer } = props;

  if (!customer) {
    return (
      <section className='border-border/60 bg-card/95 rounded-2xl border p-6 shadow-sm'>
        <div className='mb-3'>
          <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Kundeninformationen
          </h2>
          <p className='text-muted-foreground text-sm'>
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
    <section className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'>
      <div className='border-border/60 bg-muted/15 border-b p-6'>
        <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
          Kontext
        </div>
        <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
          Kundeninformationen
        </h2>
        <p className='text-muted-foreground text-sm'>
          Kontaktdaten und Anschrift des Kunden.
        </p>
      </div>

      <div className='grid gap-3 p-6 md:grid-cols-2'>
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
