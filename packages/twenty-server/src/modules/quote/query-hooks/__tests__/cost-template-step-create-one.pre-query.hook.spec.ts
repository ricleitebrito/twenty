import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateStepCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-create-one.pre-query.hook';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

describe('CostTemplateStepCreateOnePreQueryHook', () => {
  let hook: CostTemplateStepCreateOnePreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    validateSingleOutputStep: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Partial<CostTemplateStepWorkspaceEntity>,
  ): CreateOneResolverArgs<CostTemplateStepWorkspaceEntity> => ({
    data: data as CostTemplateStepWorkspaceEntity,
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
      validateSingleOutputStep: jest.fn(),
    };

    hook = new CostTemplateStepCreateOnePreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('validates uniqueness when both costTemplateId and variableName are present', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'total',
      }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      excludeRecordId: null,
    });
  });

  it('validates the output invariant when isOutput is true', async () => {
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
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: null,
    });
  });

  it('does not validate the output invariant when isOutput is false', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'total',
        isOutput: false,
      }),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('does not validate the output invariant when isOutput is absent', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'total',
      }),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('does not validate the output invariant when costTemplateId is missing, even if isOutput is true', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ variableName: 'total', isOutput: true }),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('does not validate uniqueness when costTemplateId is missing', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ variableName: 'total' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  it('does not validate uniqueness when variableName is missing', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload({ costTemplateId: 'cost-template-1' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });
});
