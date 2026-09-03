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
  findDuplicateVariableNameInBatch,
  type BatchVariableNameEntry,
} from 'src/modules/quote/query-hooks/utils/find-cost-template-batch-collision.util';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

type CostTemplateFieldUpdateManyFilter = { id: { in: string[] } };

@WorkspaceQueryHook(`costTemplateField.updateMany`)
export class CostTemplateFieldUpdateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateManyResolverArgs<
      CostTemplateFieldWorkspaceEntity,
      CostTemplateFieldUpdateManyFilter
    >,
  ): Promise<
    UpdateManyResolverArgs<
      CostTemplateFieldWorkspaceEntity,
      CostTemplateFieldUpdateManyFilter
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
        this.costTemplateValidationService.resolveEffectiveFieldState({
          workspaceId: authContext.workspace.id,
          recordId: id,
          costTemplateId: payload.data.costTemplateId,
          variableName: payload.data.variableName,
        }),
      ),
    );

    const batchEntries: BatchVariableNameEntry[] = effectiveStates
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
    // variableName under the same costTemplateId — check the batch first.
    const batchCollision = findDuplicateVariableNameInBatch(batchEntries);

    if (isDefined(batchCollision)) {
      throw new CommonQueryRunnerException(
        `Variable name "${batchCollision.variableName}" would end up on both record ${ids[batchCollision.firstIndex]} and record ${ids[batchCollision.secondIndex]}`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This update would give more than one field or step the same variable name on the same cost template.`,
        },
      );
    }

    await Promise.all(
      batchEntries.map((entry) =>
        this.costTemplateValidationService.validateUniqueVariableNames({
          workspaceId: authContext.workspace.id,
          costTemplateId: entry.costTemplateId,
          variableName: entry.variableName,
          excludeRecordId: ids[entry.index],
        }),
      ),
    );

    return payload;
  }
}
