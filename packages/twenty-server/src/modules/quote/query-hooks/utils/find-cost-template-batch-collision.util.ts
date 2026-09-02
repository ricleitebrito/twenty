import { isDefined } from 'twenty-shared/utils';

// createMany/updateMany payloads never collide against the database (the
// other rows in the same batch aren't committed yet, so a read-then-write
// DB check can't see them), so batch-internal duplicates need their own
// pass over the payload. Kept out of CostTemplateValidationService, which
// is scoped to one-record-at-a-time DB checks.

export type BatchVariableNameEntry = {
  index: number;
  costTemplateId: string;
  variableName: string;
};

export type VariableNameBatchCollision = {
  firstIndex: number;
  secondIndex: number;
  costTemplateId: string;
  variableName: string;
};

export const findDuplicateVariableNameInBatch = (
  entries: BatchVariableNameEntry[],
): VariableNameBatchCollision | null => {
  const firstIndexByKey = new Map<string, number>();

  for (const entry of entries) {
    const key = `${entry.costTemplateId}::${entry.variableName}`;
    const firstIndex = firstIndexByKey.get(key);

    if (isDefined(firstIndex)) {
      return {
        firstIndex,
        secondIndex: entry.index,
        costTemplateId: entry.costTemplateId,
        variableName: entry.variableName,
      };
    }

    firstIndexByKey.set(key, entry.index);
  }

  return null;
};

export type BatchOutputStepEntry = {
  index: number;
  costTemplateId: string;
  isOutput: boolean;
};

export type OutputStepBatchCollision = {
  firstIndex: number;
  secondIndex: number;
  costTemplateId: string;
};

export const findDuplicateOutputStepInBatch = (
  entries: BatchOutputStepEntry[],
): OutputStepBatchCollision | null => {
  const firstIndexByCostTemplateId = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.isOutput) {
      continue;
    }

    const firstIndex = firstIndexByCostTemplateId.get(entry.costTemplateId);

    if (isDefined(firstIndex)) {
      return {
        firstIndex,
        secondIndex: entry.index,
        costTemplateId: entry.costTemplateId,
      };
    }

    firstIndexByCostTemplateId.set(entry.costTemplateId, entry.index);
  }

  return null;
};
