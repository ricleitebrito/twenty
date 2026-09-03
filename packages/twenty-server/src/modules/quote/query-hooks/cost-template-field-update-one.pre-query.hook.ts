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
    // Always resolve the effective post-update state (payload value, falling
    // back to the existing record) rather than branching on which of
    // costTemplateId/variableName happens to be present in this partial
    // update — a reparent alone (costTemplateId present, variableName
    // absent) must be validated against the target template's existing
    // variable names just as much as a rename alone.
    const effectiveState =
      await this.costTemplateValidationService.resolveEffectiveFieldState({
        workspaceId: authContext.workspace.id,
        recordId: payload.id,
        costTemplateId: payload.data.costTemplateId,
        variableName: payload.data.variableName,
      });

    if (!isDefined(effectiveState)) {
      return payload;
    }

    await this.costTemplateValidationService.validateUniqueVariableNames({
      workspaceId: authContext.workspace.id,
      costTemplateId: effectiveState.costTemplateId,
      variableName: effectiveState.variableName,
      excludeRecordId: payload.id,
    });

    return payload;
  }
}
