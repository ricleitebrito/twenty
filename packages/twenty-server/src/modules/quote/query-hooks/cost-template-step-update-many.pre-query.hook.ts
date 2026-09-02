import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

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

type CostTemplateStepUpdateManyFilter = { id: { in: string[] } };

@WorkspaceQueryHook(`costTemplateStep.updateMany`)
export class CostTemplateStepUpdateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateManyResolverArgs<
      CostTemplateStepWorkspaceEntity,
      CostTemplateStepUpdateManyFilter
    >,
  ): Promise<
    UpdateManyResolverArgs<
      CostTemplateStepWorkspaceEntity,
      CostTemplateStepUpdateManyFilter
    >
  > {
    const ids = payload.filter?.id?.in;

    // updateMany applies the same `data` patch to every matched record.
    // Bulk edit in this app always scopes updateMany with `id: { in: [...] }`
    // (see workflow-destroy-many.pre-query.hook.ts for the same shape used
    // on destroyMany); if we can't resolve the affected ids we can't safely
    // validate, so we skip rather than guess.
    if (!isDefined(ids) || ids.length === 0) {
      return payload;
    }

    const effectiveStates = await Promise.all(
      ids.map((id) =>
        this.costTemplateValidationService.resolveEffectiveStepState({
          workspaceId: authContext.workspace.id,
          recordId: id,
          costTemplateId: payload.data.costTemplateId,
          variableName: payload.data.variableName,
          isOutput: payload.data.isOutput,
        }),
      ),
    );

    const variableNameEntries: BatchVariableNameEntry[] = effectiveStates
      .map((state, index) =>
        isDefined(state)
          ? {
              index,
              costTemplateId: state.costTemplateId,
              variableName: state.variableName,
            }
          : null,
      )
      .filter(isDefined);

    // None of these records are committed with their new value yet, so a
    // DB check alone can't see two matched records ending up with the same
    // variableName (or both ending up isOutput: true) under the same
    // costTemplateId — check the batch first.
    const variableNameCollision =
      findDuplicateVariableNameInBatch(variableNameEntries);

    if (isDefined(variableNameCollision)) {
      throw new CommonQueryRunnerException(
        `Variable name "${variableNameCollision.variableName}" would end up on both record ${ids[variableNameCollision.firstIndex]} and record ${ids[variableNameCollision.secondIndex]}`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This update would give more than one field or step the same variable name on the same cost template.`,
        },
      );
    }

    const outputStepEntries: BatchOutputStepEntry[] = effectiveStates
      .map((state, index) =>
        isDefined(state)
          ? {
              index,
              costTemplateId: state.costTemplateId,
              isOutput: state.isOutput,
            }
          : null,
      )
      .filter(isDefined);

    const outputStepCollision =
      findDuplicateOutputStepInBatch(outputStepEntries);

    if (isDefined(outputStepCollision)) {
      throw new CommonQueryRunnerException(
        `Record ${ids[outputStepCollision.firstIndex]} and record ${ids[outputStepCollision.secondIndex]} would both be marked as the output step for cost template ${outputStepCollision.costTemplateId}`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This update would mark more than one step as the output for the same cost template.`,
        },
      );
    }

    await Promise.all([
      ...variableNameEntries.map((entry) =>
        this.costTemplateValidationService.validateUniqueVariableNames({
          workspaceId: authContext.workspace.id,
          costTemplateId: entry.costTemplateId,
          variableName: entry.variableName,
          excludeRecordId: ids[entry.index],
        }),
      ),
      ...outputStepEntries
        .filter((entry) => entry.isOutput)
        .map((entry) =>
          this.costTemplateValidationService.validateSingleOutputStep({
            workspaceId: authContext.workspace.id,
            costTemplateId: entry.costTemplateId,
            excludeRecordId: ids[entry.index],
          }),
        ),
    ]);

    return payload;
  }
}
