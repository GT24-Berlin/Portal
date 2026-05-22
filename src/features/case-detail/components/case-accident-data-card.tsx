type CaseAccidentData = {
  claimRoute?: string | null;
  accidentDescription?: string | null;
  accidentDate?: Date | string | null;
  accidentLocation?: string | null;

  driverIsHolder?: boolean | null;
  driverName?: string | null;
  driverPhone?: string | null;

  ownPlateNumber?: string | null;
  ownCarMake?: string | null;
  ownCarModel?: string | null;
  ownCarYear?: number | null;
  ownerName?: string | null;

  opponentPlateNumber?: string | null;
  opponentCarMake?: string | null;
  opponentCarModel?: string | null;

  policeInvolved?: boolean | null;
  policeReportNumber?: string | null;
  witnessesPresent?: boolean | null;
  witnessContact?: string | null;

  ownInsurance?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    policyNumber?: string | null;
    claimNumber?: string | null;
    contactPerson?: string | null;
  } | null;

  opponentInsurance?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    policyNumber?: string | null;
    claimNumber?: string | null;
    contactPerson?: string | null;
  } | null;
};

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function fmtBool(value: boolean | null | undefined) {
  if (value === true) return 'Ja';
  if (value === false) return 'Nein';
  return null;
}

function joinValues(values: Array<string | number | null | undefined>) {
  const parts = values.map((v) => String(v ?? '').trim()).filter(Boolean);

  return parts.length ? parts.join(' · ') : null;
}

function InfoRow(props: { label: string; value?: string | null }) {
  const { label, value } = props;

  if (!value || !value.trim()) return null;

  return (
    <div className='border-border/60 bg-background/80 hover:bg-muted/20 flex flex-col gap-1 rounded-2xl border p-3 shadow-sm transition-colors'>
      <div className='text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase'>
        {label}
      </div>
      <div className='text-foreground text-sm'>{value}</div>
    </div>
  );
}

function SectionTitle(props: { children: React.ReactNode }) {
  return (
    <div className='text-foreground pt-2 text-sm font-semibold tracking-tight'>
      {props.children}
    </div>
  );
}

export default function CaseAccidentDataCard(props: {
  intake: CaseAccidentData | null | undefined;
}) {
  const { intake } = props;

  if (!intake) {
    return (
      <section className='border-border/60 bg-card/95 rounded-2xl border p-6 shadow-sm'>
        <div className='mb-3'>
          <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Unfalldaten
          </h2>
          <p className='text-muted-foreground text-sm'>
            Noch keine Unfalldaten vorhanden.
          </p>
        </div>
      </section>
    );
  }

  const ownVehicle = joinValues([
    intake.ownCarMake,
    intake.ownCarModel,
    intake.ownCarYear ? `Baujahr ${intake.ownCarYear}` : null
  ]);

  const opponentVehicle = joinValues([
    intake.opponentCarMake,
    intake.opponentCarModel
  ]);

  return (
    <section className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'>
      <div className='border-border/60 bg-muted/15 border-b p-6'>
        <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
          Kontext
        </div>
        <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
          Unfalldaten
        </h2>
        <p className='text-muted-foreground text-sm'>
          Angaben des Kunden zum Unfallhergang und zu den beteiligten
          Fahrzeugen.
        </p>
      </div>

      <div className='space-y-4 p-6'>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow label='Regulierungsweg' value={intake.claimRoute ?? null} />
          <InfoRow label='Unfalldatum' value={fmtDate(intake.accidentDate)} />
          <InfoRow label='Unfallort' value={intake.accidentLocation} />
        </div>

        <InfoRow
          label='Unfallbeschreibung'
          value={intake.accidentDescription ?? null}
        />

        <SectionTitle>Fahrer</SectionTitle>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow
            label='Fahrer ist Halter'
            value={fmtBool(intake.driverIsHolder)}
          />
          <InfoRow label='Fahrername' value={intake.driverName} />
          <InfoRow label='Fahrertelefon' value={intake.driverPhone} />
        </div>

        <SectionTitle>Eigenes Fahrzeug</SectionTitle>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow label='Kennzeichen' value={intake.ownPlateNumber} />
          <InfoRow label='Fahrzeug' value={ownVehicle} />
          <InfoRow label='Halter' value={intake.ownerName} />
        </div>

        <SectionTitle>Gegnerfahrzeug</SectionTitle>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow label='Kennzeichen' value={intake.opponentPlateNumber} />
          <InfoRow label='Fahrzeug' value={opponentVehicle} />
        </div>

        <SectionTitle>Polizei und Zeugen</SectionTitle>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow
            label='Polizei beteiligt'
            value={fmtBool(intake.policeInvolved)}
          />
          <InfoRow
            label='Polizeibericht / Aktenzeichen'
            value={intake.policeReportNumber}
          />
          <InfoRow
            label='Zeugen vorhanden'
            value={fmtBool(intake.witnessesPresent)}
          />
          <InfoRow label='Zeugenkontakt' value={intake.witnessContact} />
        </div>

        <SectionTitle>Eigene Versicherung</SectionTitle>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow label='Versicherung' value={intake.ownInsurance?.name} />
          <InfoRow label='E-Mail' value={intake.ownInsurance?.email} />
          <InfoRow label='Telefon' value={intake.ownInsurance?.phone} />
          <InfoRow
            label='Policennummer'
            value={intake.ownInsurance?.policyNumber}
          />
          <InfoRow
            label='Schadennummer'
            value={intake.ownInsurance?.claimNumber}
          />
          <InfoRow
            label='Ansprechpartner'
            value={intake.ownInsurance?.contactPerson}
          />
        </div>

        <SectionTitle>Gegnerische Versicherung</SectionTitle>
        <div className='grid gap-3 md:grid-cols-2'>
          <InfoRow
            label='Versicherung'
            value={intake.opponentInsurance?.name}
          />
          <InfoRow label='E-Mail' value={intake.opponentInsurance?.email} />
          <InfoRow label='Telefon' value={intake.opponentInsurance?.phone} />
          <InfoRow
            label='Policennummer'
            value={intake.opponentInsurance?.policyNumber}
          />
          <InfoRow
            label='Schadennummer'
            value={intake.opponentInsurance?.claimNumber}
          />
          <InfoRow
            label='Ansprechpartner'
            value={intake.opponentInsurance?.contactPerson}
          />
        </div>
      </div>
    </section>
  );
}
