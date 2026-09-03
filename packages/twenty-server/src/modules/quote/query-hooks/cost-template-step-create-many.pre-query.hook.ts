import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import {
  findDuplicateOutputStepInBatch,
  findDuplicateVariableNameInBatch,
  type BatchOutputStepEntry,
  type BatchVariableNameEntry,
} from 'src/modules/quote/query-hooks/utils/find-cost-template-batch-collision.util';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

@WorkspaceQueryHook(`costTemplateStep.createMany`)
export class CostTemplateStepCreateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateManyResolverArgs<CostTemplateStepWorkspaceEntity>,
  ): Promise<CreateManyResolverArgs<CostTemplateStepWorkspaceEntity>> {
    // CSV import and other createMany callers can insert several steps for
    // the same cost template in one payload; none of them exist in the
    // database yet, so a per-record DB check alone can't see a collision
    // between two records in this same batch — check the batch first.
    const variableNameEntries: BatchVariableNameEntry[] = payload.data
      .map((record, index) =>
        isDefined(record.costTemplateId) && isDefined(record.variableName)
          ? {
              index,
              costTemplateId: record.costTemplateId,
              variableName: record.variableName,
            }
          : null,
      )
      .filter(isDefined);

    const variableNameCollision =
      findDuplicateVariableNameInBatch(variableNameEntries);

    if (isDefined(variableNameCollision)) {
      throw new CommonQueryRunnerException(
        `Variable name "${variableNameCollision.variableName}" is used by both record ${variableNameCollision.firstIndex} and record ${variableNameCollision.secondIndex} in this batch`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This variable name is used by more than one field or step in this batch.`,
        },
      );
    }

    const outputStepEntries: BatchOutputStepEntry[] = payload.data
      .map((record, index) =>
        isDefined(record.costTemplateId)
          ? {
              index,
              costTemplateId: record.costTemplateId,
              isOutput: record.isOutput === true,
            }
          : null,
      )
      .filter(isDefined);

    const outputStepCollision =
      findDuplicateOutputStepInBatch(outputStepEntries);

    if (isDefined(outputStepCollision)) {
      throw new CommonQueryRunnerException(
        `Record ${outputStepCollision.firstIndex} and record ${outputStepCollision.secondIndex} are both marked as the output step for cost template ${outputStepCollision.costTemplateId} in this batch`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`More than one step in this batch is marked as the output for the same cost template.`,
        },
      );
    }

    await Promise.all([
      ...variableNameEntries.map((entry) =>
        this.costTemplateValidationService.validateUniqueVariableNames({
          workspaceId: authContext.workspace.id,
          costTemplateId: entry.costTemplateId,
          variableName: entry.variableName,
          excludeRecordId: null,
        }),
      ),
      ...outputStepEntries
        .filter((entry) => entry.isOutput)
        .map((entry) =>
          this.costTemplateValidationService.validateSingleOutputStep({
            workspaceId: authContext.workspace.id,
            costTemplateId: entry.costTemplateId,
            excludeRecordId: null,
          }),
        ),
    ]);

    return payload;
  }
}
