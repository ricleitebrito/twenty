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
    // Always resolve the effective post-update state (payload value, falling
    // back to the existing record) rather than branching on which of
    // costTemplateId/variableName/isOutput happens to be present in this
    // partial update — a reparent alone (costTemplateId present, isOutput
    // absent) must still be checked against the target template's existing
    // output step when the record being moved is already isOutput: true.
    const effectiveState =
      await this.costTemplateValidationService.resolveEffectiveStepState({
        workspaceId: authContext.workspace.id,
        recordId: payload.id,
        costTemplateId: payload.data.costTemplateId,
        variableName: payload.data.variableName,
        isOutput: payload.data.isOutput,
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

    if (effectiveState.isOutput === true) {
      await this.costTemplateValidationService.validateSingleOutputStep({
        workspaceId: authContext.workspace.id,
        costTemplateId: effectiveState.costTemplateId,
        excludeRecordId: payload.id,
      });
    }

    return payload;
  }
}
