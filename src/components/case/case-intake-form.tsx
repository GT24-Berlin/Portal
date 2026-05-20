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

function boolSelectValue(v: boolean | null | undefined) {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

function hasAnyText(...values: Array<string | null | undefined>) {
  return values.some((value) => cleanStr(value).length > 0);
}

export default function CaseIntakeForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [intake, setIntake] = useState<IntakeState>(emptyIntake);
  const [insuranceOwn, setInsuranceOwn] =
    useState<InsuranceState>(emptyInsurance);
  const [insuranceOpponent, setInsuranceOpponent] =
    useState<InsuranceState>(emptyInsurance);
  const [opponentVehicleKnown, setOpponentVehicleKnown] = useState(false);
  const [opponentInsuranceKnown, setOpponentInsuranceKnown] = useState(false);

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
      const insOpp = data.insuranceOpponent ?? null;

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

      const nextInsuranceOpponent: InsuranceState = {
        ...emptyInsurance,
        name: cleanStr(insOpp?.name),
        email: cleanStr(insOpp?.email),
        phone: cleanStr(insOpp?.phone),
        policyNumber: cleanStr(insOpp?.policyNumber),
        claimNumber: cleanStr(insOpp?.claimNumber),
        contactPerson: cleanStr(insOpp?.contactPerson)
      };

      setOpponentVehicleKnown(
        hasAnyText(
          i?.opponentPlateNumber,
          i?.opponentCarMake,
          i?.opponentCarModel
        )
      );
      setOpponentInsuranceKnown(
        hasAnyText(
          insOpp?.name,
          insOpp?.email,
          insOpp?.phone,
          insOpp?.policyNumber,
          insOpp?.claimNumber,
          insOpp?.contactPerson
        )
      );

      setIntake(nextIntake);
      setInsuranceOwn(nextInsurance);
      setInsuranceOpponent(nextInsuranceOpponent);
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (intake.driverIsHolder !== true) return;

    setIntake((prev) => {
      if (prev.driverIsHolder !== true) return prev;

      const nextDriverName = cleanStr(prev.ownerName);
      if (prev.driverName === nextDriverName) return prev;

      return {
        ...prev,
        driverName: nextDriverName
      };
    });
  }, [intake.driverIsHolder, intake.ownerName]);

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
        driverName:
          intake.driverIsHolder === true
            ? intake.ownerName || undefined
            : intake.driverName || undefined,
        driverPhone: intake.driverPhone || undefined,

        ownPlateNumber: intake.ownPlateNumber || undefined,
        ownCarMake: intake.ownCarMake || undefined,
        ownCarModel: intake.ownCarModel || undefined,
        ownCarYear: intake.ownCarYear ? Number(intake.ownCarYear) : undefined,
        ownerName: intake.ownerName || undefined,

        opponentPlateNumber: opponentVehicleKnown
          ? intake.opponentPlateNumber || undefined
          : undefined,
        opponentCarMake: opponentVehicleKnown
          ? intake.opponentCarMake || undefined
          : undefined,
        opponentCarModel: opponentVehicleKnown
          ? intake.opponentCarModel || undefined
          : undefined,

        policeInvolved: intake.policeInvolved ?? undefined,
        policeReportNumber:
          intake.policeInvolved === true
            ? intake.policeReportNumber || undefined
            : undefined,

        witnessesPresent: intake.witnessesPresent ?? undefined,
        witnessContact:
          intake.witnessesPresent === true
            ? intake.witnessContact || undefined
            : undefined,

        insuranceOwn: {
          name: insuranceOwn.name || undefined,
          email: insuranceOwn.email || undefined,
          phone: insuranceOwn.phone || undefined,
          policyNumber: insuranceOwn.policyNumber || undefined,
          claimNumber: insuranceOwn.claimNumber || undefined,
          contactPerson: insuranceOwn.contactPerson || undefined
        },
        insuranceOpponent: opponentInsuranceKnown
          ? {
              name: insuranceOpponent.name || undefined,
              email: insuranceOpponent.email || undefined,
              phone: insuranceOpponent.phone || undefined,
              policyNumber: insuranceOpponent.policyNumber || undefined,
              claimNumber: insuranceOpponent.claimNumber || undefined,
              contactPerson: insuranceOpponent.contactPerson || undefined
            }
          : undefined
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
      if (payload.insuranceOpponent) stripUndef(payload.insuranceOpponent);

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
      const insOpp = data.insuranceOpponent ?? null;

      setOpponentVehicleKnown(
        hasAnyText(
          i?.opponentPlateNumber,
          i?.opponentCarMake,
          i?.opponentCarModel
        )
      );
      setOpponentInsuranceKnown(
        hasAnyText(
          insOpp?.name,
          insOpp?.email,
          insOpp?.phone,
          insOpp?.policyNumber,
          insOpp?.claimNumber,
          insOpp?.contactPerson
        )
      );

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

      if (insOpp) {
        setInsuranceOpponent((prev) => ({
          ...prev,
          name: cleanStr(insOpp?.name),
          email: cleanStr(insOpp?.email),
          phone: cleanStr(insOpp?.phone),
          policyNumber: cleanStr(insOpp?.policyNumber),
          claimNumber: cleanStr(insOpp?.claimNumber),
          contactPerson: cleanStr(insOpp?.contactPerson)
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

      {/* Fahrer */}
      <div className='rounded-lg border p-4'>
        <div className='mb-2 text-sm font-semibold'>Fahrer</div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div className='space-y-1 md:col-span-2'>
            <label className='text-sm font-medium'>
              Ist der Fahrer gleich Halter?
            </label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={boolSelectValue(intake.driverIsHolder)}
              onChange={(e) =>
                setIntake((p) => {
                  const nextValue =
                    e.target.value === 'yes'
                      ? true
                      : e.target.value === 'no'
                        ? false
                        : null;

                  return {
                    ...p,
                    driverIsHolder: nextValue,
                    driverName:
                      nextValue === true ? cleanStr(p.ownerName) : p.driverName
                  };
                })
              }
            >
              <option value=''>Bitte wählen</option>
              <option value='yes'>Ja</option>
              <option value='no'>Nein</option>
            </select>
          </div>

          {intake.driverIsHolder === false ? (
            <div className='space-y-1 md:col-span-2'>
              <label className='text-sm font-medium'>Fahrername</label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={intake.driverName}
                onChange={(e) =>
                  setIntake((p) => ({ ...p, driverName: e.target.value }))
                }
                placeholder='Name des Fahrers'
              />
            </div>
          ) : null}

          <div className='space-y-1 md:col-span-2'>
            <label className='text-sm font-medium'>Fahrertelefon</label>
            <input
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={intake.driverPhone}
              onChange={(e) =>
                setIntake((p) => ({ ...p, driverPhone: e.target.value }))
              }
              placeholder='Optional'
            />
          </div>
        </div>
      </div>

      {/* Gegnerfahrzeug */}
      <div className='rounded-lg border p-4'>
        <div className='mb-2 text-sm font-semibold'>Gegnerfahrzeug</div>

        <div className='space-y-3'>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>
              Sind Ihnen die Daten des Gegnerfahrzeugs bekannt?
            </label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={opponentVehicleKnown ? 'yes' : 'no'}
              onChange={(e) =>
                setOpponentVehicleKnown(e.target.value === 'yes')
              }
            >
              <option value='no'>Nein</option>
              <option value='yes'>Ja</option>
            </select>
          </div>

          {opponentVehicleKnown ? (
            <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
              <div className='space-y-1'>
                <label className='text-sm font-medium'>Kennzeichen</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={intake.opponentPlateNumber}
                  onChange={(e) =>
                    setIntake((p) => ({
                      ...p,
                      opponentPlateNumber: e.target.value
                    }))
                  }
                  placeholder='Unbekannt'
                />
              </div>
              <div className='space-y-1'>
                <label className='text-sm font-medium'>Marke</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={intake.opponentCarMake}
                  onChange={(e) =>
                    setIntake((p) => ({
                      ...p,
                      opponentCarMake: e.target.value
                    }))
                  }
                  placeholder='Unbekannt'
                />
              </div>
              <div className='space-y-1'>
                <label className='text-sm font-medium'>Modell</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={intake.opponentCarModel}
                  onChange={(e) =>
                    setIntake((p) => ({
                      ...p,
                      opponentCarModel: e.target.value
                    }))
                  }
                  placeholder='Unbekannt'
                />
              </div>
            </div>
          ) : (
            <div className='text-muted-foreground text-sm'>
              Nicht bekannt – die Felder bleiben ausgeblendet.
            </div>
          )}
        </div>
      </div>

      {/* Polizei und Zeugen */}
      <div className='rounded-lg border p-4'>
        <div className='mb-2 text-sm font-semibold'>Polizei und Zeugen</div>

        <div className='space-y-4'>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>
              War die Polizei vor Ort?
            </label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={boolSelectValue(intake.policeInvolved)}
              onChange={(e) =>
                setIntake((p) => ({
                  ...p,
                  policeInvolved:
                    e.target.value === 'yes'
                      ? true
                      : e.target.value === 'no'
                        ? false
                        : null
                }))
              }
            >
              <option value=''>Bitte wählen</option>
              <option value='yes'>Ja</option>
              <option value='no'>Nein</option>
            </select>
          </div>

          {intake.policeInvolved === true ? (
            <div className='space-y-1'>
              <label className='text-sm font-medium'>
                Polizeibericht / Aktenzeichen
              </label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={intake.policeReportNumber}
                onChange={(e) =>
                  setIntake((p) => ({
                    ...p,
                    policeReportNumber: e.target.value
                  }))
                }
                placeholder='Optional'
              />
            </div>
          ) : null}

          <div className='space-y-1'>
            <label className='text-sm font-medium'>Gibt es Zeugen?</label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={boolSelectValue(intake.witnessesPresent)}
              onChange={(e) =>
                setIntake((p) => ({
                  ...p,
                  witnessesPresent:
                    e.target.value === 'yes'
                      ? true
                      : e.target.value === 'no'
                        ? false
                        : null
                }))
              }
            >
              <option value=''>Bitte wählen</option>
              <option value='yes'>Ja</option>
              <option value='no'>Nein</option>
            </select>
          </div>

          {intake.witnessesPresent === true ? (
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Zeugenkontakt</label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={intake.witnessContact}
                onChange={(e) =>
                  setIntake((p) => ({ ...p, witnessContact: e.target.value }))
                }
                placeholder='Optional'
              />
            </div>
          ) : null}
        </div>
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

      {/* Versicherung Gegner */}
      <div className='mt-2 rounded-lg border p-4'>
        <div className='mb-2 text-sm font-semibold'>
          Versicherung des Unfallgegners
        </div>
        <div className='space-y-3'>
          <div className='space-y-1'>
            <label className='text-sm font-medium'>
              Ist Ihnen die Versicherung des Unfallgegners bekannt?
            </label>
            <select
              className='bg-background w-full rounded-md border px-3 py-2 text-sm'
              value={opponentInsuranceKnown ? 'yes' : 'no'}
              onChange={(e) =>
                setOpponentInsuranceKnown(e.target.value === 'yes')
              }
            >
              <option value='no'>Nein</option>
              <option value='yes'>Ja</option>
            </select>
          </div>

          {opponentInsuranceKnown ? (
            <>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Name</label>
                  <input
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                    value={insuranceOpponent.name}
                    onChange={(e) =>
                      setInsuranceOpponent((p) => ({
                        ...p,
                        name: e.target.value
                      }))
                    }
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>E-Mail</label>
                  <input
                    type='email'
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                    value={insuranceOpponent.email}
                    onChange={(e) =>
                      setInsuranceOpponent((p) => ({
                        ...p,
                        email: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Telefon</label>
                  <input
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                    value={insuranceOpponent.phone}
                    onChange={(e) =>
                      setInsuranceOpponent((p) => ({
                        ...p,
                        phone: e.target.value
                      }))
                    }
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Police-Nr.</label>
                  <input
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                    value={insuranceOpponent.policyNumber}
                    onChange={(e) =>
                      setInsuranceOpponent((p) => ({
                        ...p,
                        policyNumber: e.target.value
                      }))
                    }
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Schaden-Nr.</label>
                  <input
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                    value={insuranceOpponent.claimNumber}
                    onChange={(e) =>
                      setInsuranceOpponent((p) => ({
                        ...p,
                        claimNumber: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <label className='text-sm font-medium'>Ansprechpartner</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={insuranceOpponent.contactPerson}
                  onChange={(e) =>
                    setInsuranceOpponent((p) => ({
                      ...p,
                      contactPerson: e.target.value
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <div className='text-muted-foreground text-sm'>
              Nicht bekannt – die Angaben bleiben ausgeblendet.
            </div>
          )}
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
