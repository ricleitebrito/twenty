import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

@WorkspaceQueryHook(`costTemplateField.createOne`)
export class CostTemplateFieldCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<CostTemplateFieldWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<CostTemplateFieldWorkspaceEntity>> {
    const { costTemplateId, variableName } = payload.data;

    if (isDefined(costTemplateId) && isDefined(variableName)) {
      await this.costTemplateValidationService.validateUniqueVariableNames({
        workspaceId: authContext.workspace.id,
        costTemplateId,
        variableName,
        excludeRecordId: null,
      });
    }

    return payload;
  }
}
