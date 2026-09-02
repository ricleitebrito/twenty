import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

@WorkspaceQueryHook(`costTemplateStep.updateOne`)
export class CostTemplateStepUpdateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<CostTemplateStepWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<CostTemplateStepWorkspaceEntity>> {
    const { variableName, isOutput } = payload.data;

    // Neither variableName nor isOutput is changing, nothing to re-validate
    if (!isDefined(variableName) && isOutput !== true) {
      return payload;
    }

    // costTemplateId is frequently absent from a partial update that only
    // changes variableName/isOutput (e.g. an inline edit) — fall back to
    // the existing record's costTemplateId so the checks still run.
    const costTemplateId = isDefined(payload.data.costTemplateId)
      ? payload.data.costTemplateId
      : await this.costTemplateValidationService.resolveExistingCostTemplateId({
          workspaceId: authContext.workspace.id,
          objectMetadataName: 'costTemplateStep',
          recordId: payload.id,
        });

    if (!isDefined(costTemplateId)) {
      return payload;
    }

    if (isDefined(variableName)) {
      await this.costTemplateValidationService.validateUniqueVariableNames({
        workspaceId: authContext.workspace.id,
        costTemplateId,
        variableName,
        excludeRecordId: payload.id,
      });
    }

    if (isOutput === true) {
      await this.costTemplateValidationService.validateSingleOutputStep({
        workspaceId: authContext.workspace.id,
        costTemplateId,
        excludeRecordId: payload.id,
      });
    }

    return payload;
  }
}
