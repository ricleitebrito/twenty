import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

@WorkspaceQueryHook(`costTemplateField.updateOne`)
export class CostTemplateFieldUpdateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<CostTemplateFieldWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<CostTemplateFieldWorkspaceEntity>> {
    const { variableName } = payload.data;

    // variableName isn't changing in this update, nothing to re-validate
    if (!isDefined(variableName)) {
      return payload;
    }

    // costTemplateId is frequently absent from a partial update that only
    // changes variableName (e.g. an inline rename) — fall back to the
    // existing record's costTemplateId so the check still runs.
    const costTemplateId = isDefined(payload.data.costTemplateId)
      ? payload.data.costTemplateId
      : await this.costTemplateValidationService.resolveExistingCostTemplateId({
          workspaceId: authContext.workspace.id,
          objectMetadataName: 'costTemplateField',
          recordId: payload.id,
        });

    if (isDefined(costTemplateId)) {
      await this.costTemplateValidationService.validateUniqueVariableNames({
        workspaceId: authContext.workspace.id,
        costTemplateId,
        variableName,
        excludeRecordId: payload.id,
      });
    }

    return payload;
  }
}
