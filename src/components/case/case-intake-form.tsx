'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type ClaimRoute = 'OPPONENT_LIABILITY' | 'OWN_CASCO' | 'UNKNOWN';

type IntakeState = {
  claimRoute: ClaimRoute;

  accidentDescription: string;
  accidentDate: string; // yyyy-mm-dd
  accidentLocation: string;

  driverIsHolder: boolean | null;
  driverName: string;
  driverPhone: string;

  ownPlateNumber: string;
  ownCarMake: string;
  ownCarModel: string;
  ownCarYear: string; // input text
  ownerName: string;

  opponentPlateNumber: string;
  opponentCarMake: string;
  opponentCarModel: string;

  policeInvolved: boolean | null;
  policeReportNumber: string;

  witnessesPresent: boolean | null;
  witnessContact: string;
};

type InsuranceState = {
  name: string;
  email: string;
  phone: string;
  policyNumber: string;
  claimNumber: string;
  contactPerson: string;
};

const emptyIntake: IntakeState = {
  claimRoute: 'UNKNOWN',

  accidentDescription: '',
  accidentDate: '',
  accidentLocation: '',

  driverIsHolder: null,
  driverName: '',
  driverPhone: '',

  ownPlateNumber: '',
  ownCarMake: '',
  ownCarModel: '',
  ownCarYear: '',
  ownerName: '',

  opponentPlateNumber: '',
  opponentCarMake: '',
  opponentCarModel: '',

  policeInvolved: null,
  policeReportNumber: '',

  witnessesPresent: null,
  witnessContact: ''
};

const emptyInsurance: InsuranceState = {
  name: '',
  email: '',
  phone: '',
  policyNumber: '',
  claimNumber: '',
  contactPerson: ''
};

function toYmd(d: any): string {
  if (!d) return '';
  // d kann ISO string oder Date sein
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function cleanStr(v: any): string {
  return String(v ?? '').trim();
}

function cleanBoolNullable(v: any): boolean | null {
  if (v === true || v === false) return v;
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (!s) return null;
  if (['true', '1', 'yes', 'ja'].includes(s)) return true;
  if (['false', '0', 'no', 'nein'].includes(s)) return false;
  return null;
}

export default function CaseIntakeForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [intake, setIntake] = useState<IntakeState>(emptyIntake);
  const [insuranceOwn, setInsuranceOwn] =
    useState<InsuranceState>(emptyInsurance);

  const endpoint = useMemo(() => `/api/case/${token}/intake`, [token]);

  const load = useCallback(async () => {
    setError(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Load failed (${res.status})`);
      }

      const i = data.intake ?? null;
      const ins = data.insuranceOwn ?? null;

      // Intake mapping (nur bekannte Felder, alles andere ignorieren)
      const nextIntake: IntakeState = {
        ...emptyIntake,
        claimRoute: (i?.claimRoute as ClaimRoute) || 'UNKNOWN',

        accidentDescription: cleanStr(i?.accidentDescription),
        accidentDate: toYmd(i?.accidentDate),
        accidentLocation: cleanStr(i?.accidentLocation),

        driverIsHolder: cleanBoolNullable(i?.driverIsHolder),
        driverName: cleanStr(i?.driverName),
        driverPhone: cleanStr(i?.driverPhone),

        ownPlateNumber: cleanStr(i?.ownPlateNumber),
        ownCarMake: cleanStr(i?.ownCarMake),
        ownCarModel: cleanStr(i?.ownCarModel),
        ownCarYear: i?.ownCarYear != null ? String(i.ownCarYear) : '',
        ownerName: cleanStr(i?.ownerName),

        opponentPlateNumber: cleanStr(i?.opponentPlateNumber),
        opponentCarMake: cleanStr(i?.opponentCarMake),
        opponentCarModel: cleanStr(i?.opponentCarModel),

        policeInvolved: cleanBoolNullable(i?.policeInvolved),
        policeReportNumber: cleanStr(i?.policeReportNumber),

        witnessesPresent: cleanBoolNullable(i?.witnessesPresent),
        witnessContact: cleanStr(i?.witnessContact)
      };

      const nextInsurance: InsuranceState = {
        ...emptyInsurance,
        name: cleanStr(ins?.name),
        email: cleanStr(ins?.email),
        phone: cleanStr(ins?.phone),
        policyNumber: cleanStr(ins?.policyNumber),
        claimNumber: cleanStr(ins?.claimNumber),
        contactPerson: cleanStr(ins?.contactPerson)
      };

      setIntake(nextIntake);
      setInsuranceOwn(nextInsurance);
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setError(null);
    setOkMsg(null);
    setSaving(true);

    try {
      // API erwartet flachen Body; wir schicken nur Felder, die NICHT leer sind
      const payload: any = {
        claimRoute: intake.claimRoute,

        accidentDescription: intake.accidentDescription || undefined,
        accidentDate: intake.accidentDate || undefined, // yyyy-mm-dd
        accidentLocation: intake.accidentLocation || undefined,

        driverIsHolder: intake.driverIsHolder ?? undefined,
        driverName: intake.driverName || undefined,
        driverPhone: intake.driverPhone || undefined,

        ownPlateNumber: intake.ownPlateNumber || undefined,
        ownCarMake: intake.ownCarMake || undefined,
        ownCarModel: intake.ownCarModel || undefined,
        ownCarYear: intake.ownCarYear ? Number(intake.ownCarYear) : undefined,
        ownerName: intake.ownerName || undefined,

        opponentPlateNumber: intake.opponentPlateNumber || undefined,
        opponentCarMake: intake.opponentCarMake || undefined,
        opponentCarModel: intake.opponentCarModel || undefined,

        policeInvolved: intake.policeInvolved ?? undefined,
        policeReportNumber: intake.policeReportNumber || undefined,

        witnessesPresent: intake.witnessesPresent ?? undefined,
        witnessContact: intake.witnessContact || undefined,

        insuranceOwn: {
          name: insuranceOwn.name || undefined,
          email: insuranceOwn.email || undefined,
          phone: insuranceOwn.phone || undefined,
          policyNumber: insuranceOwn.policyNumber || undefined,
          claimNumber: insuranceOwn.claimNumber || undefined,
          contactPerson: insuranceOwn.contactPerson || undefined
        }
      };

      // undefined keys entfernen (sauber)
      const stripUndef = (obj: any) => {
        for (const k of Object.keys(obj)) {
          if (obj[k] === undefined) delete obj[k];
        }
        return obj;
      };
      stripUndef(payload);
      if (payload.insuranceOwn) stripUndef(payload.insuranceOwn);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      // WICHTIG: Nach Save aus Response in State übernehmen (so bleibt alles sichtbar)
      const i = data.intake ?? null;
      const ins = data.insuranceOwn ?? null;

      setIntake((prev) => ({
        ...prev,
        claimRoute: (i?.claimRoute as ClaimRoute) || prev.claimRoute,
        accidentDescription: cleanStr(i?.accidentDescription),
        accidentDate: toYmd(i?.accidentDate),
        accidentLocation: cleanStr(i?.accidentLocation),

        driverIsHolder: cleanBoolNullable(i?.driverIsHolder),
        driverName: cleanStr(i?.driverName),
        driverPhone: cleanStr(i?.driverPhone),

        ownPlateNumber: cleanStr(i?.ownPlateNumber),
        ownCarMake: cleanStr(i?.ownCarMake),
        ownCarModel: cleanStr(i?.ownCarModel),
        ownCarYear: i?.ownCarYear != null ? String(i.ownCarYear) : '',
        ownerName: cleanStr(i?.ownerName),

        opponentPlateNumber: cleanStr(i?.opponentPlateNumber),
        opponentCarMake: cleanStr(i?.opponentCarMake),
        opponentCarModel: cleanStr(i?.opponentCarModel),

        policeInvolved: cleanBoolNullable(i?.policeInvolved),
        policeReportNumber: cleanStr(i?.policeReportNumber),

        witnessesPresent: cleanBoolNullable(i?.witnessesPresent),
        witnessContact: cleanStr(i?.witnessContact)
      }));

      if (ins) {
        setInsuranceOwn((prev) => ({
          ...prev,
          name: cleanStr(ins?.name),
          email: cleanStr(ins?.email),
          phone: cleanStr(ins?.phone),
          policyNumber: cleanStr(ins?.policyNumber),
          claimNumber: cleanStr(ins?.claimNumber),
          contactPerson: cleanStr(ins?.contactPerson)
        }));
      }

      setOkMsg('Gespeichert ✅');
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className='bg-card space-y-2 rounded-xl border px-5 py-6'>
        <div className='text-muted-foreground text-sm'>
          Lade Unfall & Daten…
        </div>
      </div>
    );
  }

  return (
    <div className='bg-card space-y-4 rounded-xl border px-5 py-6'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold'>Unfall & Daten</h3>
          <p className='text-muted-foreground text-sm'>
            Bitte trage die wichtigsten Angaben ein. Du kannst jederzeit
            bearbeiten.
          </p>
        </div>
        <button
          type='button'
          onClick={save}
          disabled={saving}
          className='bg-foreground text-background rounded-md px-3 py-2 text-sm disabled:opacity-60'
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>

      {error ? <div className='text-sm text-red-500'>{error}</div> : null}
      {okMsg ? <div className='text-sm text-green-600'>{okMsg}</div> : null}

      {/* Claim Route */}
      <div className='space-y-1'>
        <label className='text-sm font-medium'>Regulierungsweg</label>
        <select
          className='bg-background w-full rounded-md border px-3 py-2 text-sm'
          value={intake.claimRoute}
          onChange={(e) =>
            setIntake((p) => ({
              ...p,
              claimRoute: e.target.value as ClaimRoute
            }))
          }
        >
          <option value='UNKNOWN'>Unbekannt</option>
          <option value='OPPONENT_LIABILITY'>Gegnerische Haftpflicht</option>
          <option value='OWN_CASCO'>Eigene Kasko</option>
        </select>
      </div>

      {/* Unfallbeschreibung */}
      <div className='space-y-1'>
        <label className='text-sm font-medium'>Unfallhergang</label>
        <textarea
          className='bg-background focus:ring-ring min-h-[120px] w-full rounded-lg border p-3 text-sm outline-none focus:ring-2'
          value={intake.accidentDescription}
          onChange={(e) =>
            setIntake((p) => ({ ...p, accidentDescription: e.target.value }))
          }
          placeholder='Kurz beschreiben (Ort, Datum, Beteiligte)…'
        />
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <div className='space-y-1'>
          <label className='text-sm font-medium'>Unfalldatum</label>
          <input
            type='date'
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={intake.accidentDate}
            onChange={(e) =>
              setIntake((p) => ({ ...p, accidentDate: e.target.value }))
            }
          />
        </div>
        <div className='space-y-1'>
          <label className='text-sm font-medium'>Unfallort</label>
          <input
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={intake.accidentLocation}
            onChange={(e) =>
              setIntake((p) => ({ ...p, accidentLocation: e.target.value }))
            }
            placeholder='Straße, Ort'
          />
        </div>
      </div>

      {/* Fahrzeug */}
      <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
        <div className='space-y-1'>
          <label className='text-sm font-medium'>Kennzeichen</label>
          <input
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={intake.ownPlateNumber}
            onChange={(e) =>
              setIntake((p) => ({ ...p, ownPlateNumber: e.target.value }))
            }
          />
        </div>
        <div className='space-y-1'>
          <label className='text-sm font-medium'>Marke</label>
          <input
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={intake.ownCarMake}
            onChange={(e) =>
              setIntake((p) => ({ ...p, ownCarMake: e.target.value }))
            }
          />
        </div>
        <div className='space-y-1'>
          <label className='text-sm font-medium'>Modell</label>
          <input
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={intake.ownCarModel}
            onChange={(e) =>
              setIntake((p) => ({ ...p, ownCarModel: e.target.value }))
            }
          />
        </div>
        <div className='space-y-1'>
          <label className='text-sm font-medium'>Baujahr</label>
          <input
            inputMode='numeric'
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={intake.ownCarYear}
            onChange={(e) =>
              setIntake((p) => ({ ...p, ownCarYear: e.target.value }))
            }
            placeholder='z.B. 2020'
          />
        </div>
      </div>

      <div className='space-y-1'>
        <label className='text-sm font-medium'>Halter (Name)</label>
        <input
          className='bg-background w-full rounded-md border px-3 py-2 text-sm'
          value={intake.ownerName}
          onChange={(e) =>
            setIntake((p) => ({ ...p, ownerName: e.target.value }))
          }
        />
      </div>

      {/* Versicherung OWN */}
      <div className='mt-2 rounded-lg border p-4'>
        <div className='mb-2 text-sm font-semibold'>Eigene Versicherung</div>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>Name</label>
            <input
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={insuranceOwn.name}
              onChange={(e) =>
                setInsuranceOwn((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>E-Mail</label>
            <input
              type='email'
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={insuranceOwn.email}
              onChange={(e) =>
                setInsuranceOwn((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>
        </div>

        <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>Telefon</label>
            <input
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={insuranceOwn.phone}
              onChange={(e) =>
                setInsuranceOwn((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>Police-Nr.</label>
            <input
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={insuranceOwn.policyNumber}
              onChange={(e) =>
                setInsuranceOwn((p) => ({ ...p, policyNumber: e.target.value }))
              }
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>Schaden-Nr.</label>
            <input
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={insuranceOwn.claimNumber}
              onChange={(e) =>
                setInsuranceOwn((p) => ({ ...p, claimNumber: e.target.value }))
              }
            />
          </div>
        </div>

        <div className='mt-3 space-y-1'>
          <label className='text-sm font-medium'>Ansprechpartner</label>
          <input
            className='bg-background w-full rounded-md border px-3 py-2 text-sm'
            value={insuranceOwn.contactPerson}
            onChange={(e) =>
              setInsuranceOwn((p) => ({ ...p, contactPerson: e.target.value }))
            }
          />
        </div>
      </div>

      <div className='flex justify-end'>
        <button
          type='button'
          onClick={save}
          disabled={saving}
          className='bg-foreground text-background rounded-md px-3 py-2 text-sm disabled:opacity-60'
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
