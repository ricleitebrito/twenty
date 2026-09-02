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
    resolveEffectiveStepState: jest.Mock;
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
      resolveEffectiveStepState: jest.fn(),
    };

    hook = new CostTemplateStepUpdateOnePreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  // Regression: an earlier version skipped both checks unless variableName
  // or isOutput was part of the payload, missing a reparent-only update.
  it('always resolves the effective state and validates uniqueness, even when the update touches an unrelated field', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      isOutput: false,
    });

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ formula: '1 + 1' }),
    );

    expect(
      costTemplateValidationService.resolveEffectiveStepState,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      recordId: 'step-1',
      costTemplateId: undefined,
      variableName: undefined,
      isOutput: undefined,
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
    ).not.toHaveBeenCalled();
  });

  it('validates using the effective costTemplateId/variableName/isOutput from the payload', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      isOutput: true,
    });

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

  it('does not re-validate the output invariant when the effective isOutput is false', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      isOutput: false,
    });

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ isOutput: false }),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  // Regression: moving an existing isOutput: true step into a different
  // template (reparent-only update, isOutput absent from this payload) must
  // still be checked against the target template's existing output step.
  it('validates the output invariant on a reparent-only update when the existing record is already isOutput: true', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue({
      costTemplateId: 'cost-template-2',
      variableName: 'total',
      isOutput: true,
    });

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ costTemplateId: 'cost-template-2' }),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-2',
      excludeRecordId: 'step-1',
    });
  });

  it('skips both validations when the existing record cannot be found', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue(
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
