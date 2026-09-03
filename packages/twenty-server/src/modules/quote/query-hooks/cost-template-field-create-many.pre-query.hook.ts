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
  findDuplicateVariableNameInBatch,
  type BatchVariableNameEntry,
} from 'src/modules/quote/query-hooks/utils/find-cost-template-batch-collision.util';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

@WorkspaceQueryHook(`costTemplateField.createMany`)
export class CostTemplateFieldCreateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateManyResolverArgs<CostTemplateFieldWorkspaceEntity>,
  ): Promise<CreateManyResolverArgs<CostTemplateFieldWorkspaceEntity>> {
    // CSV import and other createMany callers can insert several fields for
    // the same cost template in one payload; none of them exist in the
    // database yet, so a per-record DB check alone can't see a collision
    // between two records in this same batch — check the batch first.
    const batchEntries: BatchVariableNameEntry[] = payload.data
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

    const batchCollision = findDuplicateVariableNameInBatch(batchEntries);

    if (isDefined(batchCollision)) {
      throw new CommonQueryRunnerException(
        `Variable name "${batchCollision.variableName}" is used by both record ${batchCollision.firstIndex} and record ${batchCollision.secondIndex} in this batch`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This variable name is used by more than one field or step in this batch.`,
        },
      );
    }

    await Promise.all(
      batchEntries.map((entry) =>
        this.costTemplateValidationService.validateUniqueVariableNames({
          workspaceId: authContext.workspace.id,
          costTemplateId: entry.costTemplateId,
          variableName: entry.variableName,
          excludeRecordId: null,
        }),
      ),
    );

    return payload;
  }
}
