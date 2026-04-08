import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClaimRoute, InsuranceParty } from '@prisma/client';

export const runtime = 'nodejs';

const has = (obj: any, key: string) =>
  Object.prototype.hasOwnProperty.call(obj ?? {}, key);

const clean = (v: any) => String(v ?? '').trim();

// IMPORTANT: undefined => Prisma lässt Feld unverändert (bei update)
const opt = (v: any) => {
  const s = clean(v);
  return s.length ? s : undefined;
};

const optInt = (v: any) => {
  const s = clean(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const optBool = (v: any) => {
  if (v === true || v === false) return v;
  const s = clean(v).toLowerCase();
  if (!s) return undefined;
  if (['true', '1', 'yes', 'ja'].includes(s)) return true;
  if (['false', '0', 'no', 'nein'].includes(s)) return false;
  return undefined;
};

const optDate = (v: any) => {
  const s = clean(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const normalizeClaimRoute = (v: any): ClaimRoute => {
  const s = clean(v).toUpperCase();
  if (s === 'OPPONENT_LIABILITY') return ClaimRoute.OPPONENT_LIABILITY;
  if (s === 'OWN_CASCO') return ClaimRoute.OWN_CASCO;
  return ClaimRoute.UNKNOWN;
};

/**
 * GET /api/case/:token/intake
 * Liefert Intake + OWN/OPPONENT Insurance (falls vorhanden)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: { id: true }
    });

    if (!c) {
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    const intake = await prisma.caseIntake.findUnique({
      where: { caseId: c.id }
    });

    if (!intake) {
      return NextResponse.json({
        ok: true,
        intake: null,
        insuranceOwn: null,
        insuranceOpponent: null
      });
    }

    const insuranceOwn = await prisma.caseInsurance.findFirst({
      where: { party: InsuranceParty.OWN, ownIntakeId: intake.id },
      orderBy: { updatedAt: 'desc' }
    });

    const insuranceOpponent = await prisma.caseInsurance.findFirst({
      where: { party: InsuranceParty.OPPONENT, opponentIntakeId: intake.id },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({
      ok: true,
      intake,
      insuranceOwn: insuranceOwn ?? null,
      insuranceOpponent: insuranceOpponent ?? null
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/case/:token/intake
 * Upsert Intake + optional OWN/OPPONENT insurance
 *
 * Erwartet JSON:
 * {
 *   claimRoute?,
 *   accidentDescription?, accidentDate?, accidentLocation?,
 *   driverIsHolder?, driverName?, driverPhone?,
 *   ownCarMake?, ownCarModel?, ownCarYear?, ownPlateNumber?, ownerName?,
 *   opponentCarMake?, opponentCarModel?, opponentPlateNumber?,
 *   policeInvolved?, policeReportNumber?, witnessesPresent?, witnessContact?,
 *
 *   // Backward compat (alte Felder dürfen weiter funktionieren)
 *   insuranceName?, insuranceNumber?, insuranceEmail?,
 *   carMake?, carModel?, carYear?, plateNumber?, holderName?,
 *
 *   // Neues Insurance-Objekt (optional)
 *   insuranceOwn?: { name?, email?, phone?, policyNumber?, claimNumber?, contactPerson? }
 *   insuranceOpponent?: { name?, email?, phone?, policyNumber?, claimNumber?, contactPerson? }
 * }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;

    const c = await prisma.case.findUnique({
      where: { token },
      select: { id: true }
    });

    if (!c) {
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    // Build "data" only from keys that are present in request body
    const data: any = {};

    // claim route
    if (has(body, 'claimRoute'))
      data.claimRoute = normalizeClaimRoute(body.claimRoute);

    // Unfall
    if (has(body, 'accidentDescription'))
      data.accidentDescription = opt(body.accidentDescription);
    if (has(body, 'accidentDate'))
      data.accidentDate = optDate(body.accidentDate);
    if (has(body, 'accidentLocation'))
      data.accidentLocation = opt(body.accidentLocation);

    // Fahrer
    if (has(body, 'driverIsHolder'))
      data.driverIsHolder = optBool(body.driverIsHolder);
    if (has(body, 'driverName')) data.driverName = opt(body.driverName);
    if (has(body, 'driverPhone')) data.driverPhone = opt(body.driverPhone);

    // Fahrzeug (neu)
    if (has(body, 'ownPlateNumber'))
      data.ownPlateNumber = opt(body.ownPlateNumber);
    if (has(body, 'ownCarMake')) data.ownCarMake = opt(body.ownCarMake);
    if (has(body, 'ownCarModel')) data.ownCarModel = opt(body.ownCarModel);
    if (has(body, 'ownCarYear')) data.ownCarYear = optInt(body.ownCarYear);
    if (has(body, 'ownerName')) data.ownerName = opt(body.ownerName);

    if (has(body, 'opponentPlateNumber'))
      data.opponentPlateNumber = opt(body.opponentPlateNumber);
    if (has(body, 'opponentCarMake'))
      data.opponentCarMake = opt(body.opponentCarMake);
    if (has(body, 'opponentCarModel'))
      data.opponentCarModel = opt(body.opponentCarModel);

    // Polizei / Zeugen
    if (has(body, 'policeInvolved'))
      data.policeInvolved = optBool(body.policeInvolved);
    if (has(body, 'policeReportNumber'))
      data.policeReportNumber = opt(body.policeReportNumber);
    if (has(body, 'witnessesPresent'))
      data.witnessesPresent = optBool(body.witnessesPresent);
    if (has(body, 'witnessContact'))
      data.witnessContact = opt(body.witnessContact);

    // Backward compat (falls diese Spalten noch existieren)
    if (has(body, 'insuranceName'))
      data.insuranceName = opt(body.insuranceName);
    if (has(body, 'insuranceNumber'))
      data.insuranceNumber = opt(body.insuranceNumber);
    if (has(body, 'insuranceEmail'))
      data.insuranceEmail = opt(body.insuranceEmail);

    if (has(body, 'carMake')) data.carMake = opt(body.carMake);
    if (has(body, 'carModel')) data.carModel = opt(body.carModel);
    if (has(body, 'carYear')) data.carYear = optInt(body.carYear);
    if (has(body, 'plateNumber')) data.plateNumber = opt(body.plateNumber);
    if (has(body, 'holderName')) data.holderName = opt(body.holderName);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Intake upsert
      const intake = await tx.caseIntake.upsert({
        where: { caseId: c.id },
        create: {
          caseId: c.id,
          ...data
        },
        update: {
          ...data
        }
      });

      // 2) OWN Insurance create/update (über ownIntakeId)
      const ownName = opt(body.insuranceName ?? body.insuranceOwn?.name);
      const ownEmail = opt(body.insuranceEmail ?? body.insuranceOwn?.email);
      const ownPolicy = opt(
        body.insuranceNumber ?? body.insuranceOwn?.policyNumber
      );
      const ownPhone = opt(body.insuranceOwn?.phone);
      const ownClaim = opt(body.insuranceOwn?.claimNumber);
      const ownContact = opt(body.insuranceOwn?.contactPerson);

      let insuranceOwn = await tx.caseInsurance.findFirst({
        where: { party: InsuranceParty.OWN, ownIntakeId: intake.id },
        orderBy: { updatedAt: 'desc' }
      });

      const hasAnyOwn = !!(
        ownName ||
        ownEmail ||
        ownPolicy ||
        ownPhone ||
        ownClaim ||
        ownContact
      );

      if (hasAnyOwn) {
        if (insuranceOwn) {
          insuranceOwn = await tx.caseInsurance.update({
            where: { id: insuranceOwn.id },
            data: {
              // party bleibt OWN
              name: ownName,
              email: ownEmail,
              phone: ownPhone,
              policyNumber: ownPolicy,
              claimNumber: ownClaim,
              contactPerson: ownContact,
              ownIntakeId: intake.id
            }
          });
        } else {
          insuranceOwn = await tx.caseInsurance.create({
            data: {
              party: InsuranceParty.OWN,
              name: ownName,
              email: ownEmail,
              phone: ownPhone,
              policyNumber: ownPolicy,
              claimNumber: ownClaim,
              contactPerson: ownContact,
              ownIntakeId: intake.id
            }
          });
        }
      }

      // 3) OPPONENT Insurance create/update (über opponentIntakeId)
      const oppName = opt(body.insuranceOpponent?.name);
      const oppEmail = opt(body.insuranceOpponent?.email);
      const oppPolicy = opt(body.insuranceOpponent?.policyNumber);
      const oppPhone = opt(body.insuranceOpponent?.phone);
      const oppClaim = opt(body.insuranceOpponent?.claimNumber);
      const oppContact = opt(body.insuranceOpponent?.contactPerson);

      let insuranceOpponent = await tx.caseInsurance.findFirst({
        where: { party: InsuranceParty.OPPONENT, opponentIntakeId: intake.id },
        orderBy: { updatedAt: 'desc' }
      });

      const hasAnyOpp = !!(
        oppName ||
        oppEmail ||
        oppPolicy ||
        oppPhone ||
        oppClaim ||
        oppContact
      );

      if (hasAnyOpp) {
        if (insuranceOpponent) {
          insuranceOpponent = await tx.caseInsurance.update({
            where: { id: insuranceOpponent.id },
            data: {
              // party bleibt OPPONENT
              name: oppName,
              email: oppEmail,
              phone: oppPhone,
              policyNumber: oppPolicy,
              claimNumber: oppClaim,
              contactPerson: oppContact,
              opponentIntakeId: intake.id
            }
          });
        } else {
          insuranceOpponent = await tx.caseInsurance.create({
            data: {
              party: InsuranceParty.OPPONENT,
              name: oppName,
              email: oppEmail,
              phone: oppPhone,
              policyNumber: oppPolicy,
              claimNumber: oppClaim,
              contactPerson: oppContact,
              opponentIntakeId: intake.id
            }
          });
        }
      }

      return {
        intake,
        insuranceOwn: insuranceOwn ?? null,
        insuranceOpponent: insuranceOpponent ?? null
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
