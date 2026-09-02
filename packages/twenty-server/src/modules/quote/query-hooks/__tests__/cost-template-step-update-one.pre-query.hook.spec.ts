import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateStepUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-update-one.pre-query.hook';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

describe('CostTemplateStepUpdateOnePreQueryHook', () => {
  let hook: CostTemplateStepUpdateOnePreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    validateSingleOutputStep: jest.Mock;
    resolveExistingCostTemplateId: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Partial<CostTemplateStepWorkspaceEntity>,
  ): UpdateOneResolverArgs<CostTemplateStepWorkspaceEntity> => ({
    id: 'step-1',
    data: data as CostTemplateStepWorkspaceEntity,
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
      validateSingleOutputStep: jest.fn(),
      resolveExistingCostTemplateId: jest.fn(),
    };

    hook = new CostTemplateStepUpdateOnePreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('does not validate or fetch the existing record when neither variableName nor isOutput is part of the update', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ formula: '1 + 1' }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('does not re-validate the output invariant when isOutput is being cleared (set to false)', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ isOutput: false }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('validates using costTemplateId from the payload when it is present, without fetching the existing record', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'total',
        isOutput: true,
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
      variableName: 'total',
      excludeRecordId: 'step-1',
    });
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: 'step-1',
    });
  });

  // Regression: a partial update that only renames the variable (or only
  // flips isOutput), the common inline-edit shape, omits costTemplateId
  // entirely, so the hook must fetch it from the existing record instead
  // of silently skipping both checks.
  it('fetches the existing costTemplateId once when the update payload omits it and both fields are changing', async () => {
    costTemplateValidationService.resolveExistingCostTemplateId.mockResolvedValue(
      'cost-template-1',
    );

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ variableName: 'total', isOutput: true }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).toHaveBeenCalledTimes(1);
    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      objectMetadataName: 'costTemplateStep',
      recordId: 'step-1',
    });
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      excludeRecordId: 'step-1',
    });
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: 'step-1',
    });
  });

  it('fetches the existing costTemplateId when only isOutput is set to true and costTemplateId is absent', async () => {
    costTemplateValidationService.resolveExistingCostTemplateId.mockResolvedValue(
      'cost-template-1',
    );

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ isOutput: true }),
    );

    expect(
      costTemplateValidationService.resolveExistingCostTemplateId,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      objectMetadataName: 'costTemplateStep',
      recordId: 'step-1',
    });
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: 'step-1',
    });
  });

  it('skips both validations when the existing record cannot be found', async () => {
    costTemplateValidationService.resolveExistingCostTemplateId.mockResolvedValue(
      null,
    );

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ variableName: 'total', isOutput: true }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });
});
