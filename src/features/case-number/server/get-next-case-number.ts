import { Prisma } from '@prisma/client';

const CASE_NUMBER_SEQUENCE_ID = 'global';
const CASE_NUMBER_PREFIX = 'GT';
const CASE_NUMBER_LENGTH = 4;

function formatCaseNumber(value: number) {
  return `${CASE_NUMBER_PREFIX}${String(value).padStart(CASE_NUMBER_LENGTH, '0')}`;
}

export async function getNextCaseNumber(tx: Prisma.TransactionClient) {
  await tx.caseNumberSequence.upsert({
    where: { id: CASE_NUMBER_SEQUENCE_ID },
    update: {},
    create: {
      id: CASE_NUMBER_SEQUENCE_ID,
      currentValue: 0
    }
  });

  const lockedRows = await tx.$queryRaw<{ currentValue: number }[]>`
    SELECT "currentValue"
    FROM "CaseNumberSequence"
    WHERE id = ${CASE_NUMBER_SEQUENCE_ID}
    FOR UPDATE
  `;

  const maxRows = await tx.$queryRaw<{ maxCaseNumber: number | null }[]>`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING("caseNumber" FROM 3) AS INTEGER)),
      0
    ) AS "maxCaseNumber"
    FROM "Case"
    WHERE "caseNumber" ~ '^GT[0-9]+$'
  `;

  const maxExistingValue = maxRows[0]?.maxCaseNumber ?? 0;

  const currentValue = lockedRows[0]?.currentValue ?? 0;
  const nextValue = Math.max(currentValue, maxExistingValue) + 1;

  await tx.caseNumberSequence.update({
    where: { id: CASE_NUMBER_SEQUENCE_ID },
    data: { currentValue: nextValue }
  });

  return formatCaseNumber(nextValue);
}
