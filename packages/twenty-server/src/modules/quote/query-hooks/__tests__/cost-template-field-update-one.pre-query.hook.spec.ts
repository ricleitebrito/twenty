import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-one.pre-query.hook';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

describe('CostTemplateFieldUpdateOnePreQueryHook', () => {
  let hook: CostTemplateFieldUpdateOnePreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    resolveExistingCostTemplateId: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Partial<CostTemplateFieldWorkspaceEntity>,
  ): UpdateOneResolverArgs<CostTemplateFieldWorkspaceEntity> => ({
    id: 'field-1',
    data: data as CostTemplateFieldWorkspaceEntity,
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
      resolveExistingCostTemplateId: jest.fn(),
    };

    hook = new CostTemplateFieldUpdateOnePreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('does not validate or fetch the existing record when variableName is not part of the update', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ name: 'New name' }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  it('validates using costTemplateId from the payload when it is present, without fetching the existing record', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
      }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
      excludeRecordId: 'field-1',
    });
  });

  // Regression: a partial update that only renames the field (the common
  // inline-edit shape) omits costTemplateId entirely, so the hook must
  // fetch it from the existing record instead of silently skipping the
  // uniqueness check.
  it('fetches the existing costTemplateId when the update payload omits it', async () => {
    costTemplateValidationService.resolveExistingCostTemplateId.mockResolvedValue(
      'cost-template-1',
    );

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ variableName: 'quantity' }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      objectMetadataName: 'costTemplateField',
      recordId: 'field-1',
    });
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
      excludeRecordId: 'field-1',
    });
  });

  it('skips validation when the existing record cannot be found', async () => {
    costTemplateValidationService.resolveExistingCostTemplateId.mockResolvedValue(
      null,
    );

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ variableName: 'quantity' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });
});
