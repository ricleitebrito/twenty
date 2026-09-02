import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type UpdateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateStepUpdateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-update-many.pre-query.hook';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

describe('CostTemplateStepUpdateManyPreQueryHook', () => {
  let hook: CostTemplateStepUpdateManyPreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    validateSingleOutputStep: jest.Mock;
    resolveEffectiveStepState: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    ids: string[],
    data: Partial<CostTemplateStepWorkspaceEntity>,
  ): UpdateManyResolverArgs<
    CostTemplateStepWorkspaceEntity,
    { id: { in: string[] } }
  > => ({
    filter: { id: { in: ids } },
    data: data as CostTemplateStepWorkspaceEntity,
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
      validateSingleOutputStep: jest.fn(),
      resolveEffectiveStepState: jest.fn(),
    };

    hook = new CostTemplateStepUpdateManyPreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('skips validation when the filter does not resolve to a bounded set of ids', async () => {
    await hook.execute(authContext, 'costTemplateStep', {
      filter: {},
      data: { formula: '1 + 1' },
    } as unknown as UpdateManyResolverArgs<
      CostTemplateStepWorkspaceEntity,
      { id: { in: string[] } }
    >);

    expect(
      costTemplateValidationService.resolveEffectiveStepState,
    ).not.toHaveBeenCalled();
  });

  it('resolves effective state for every matched id and validates uniqueness and output invariant', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockImplementation(
      ({ recordId }: { recordId: string }) =>
        Promise.resolve({
          costTemplateId: 'cost-template-1',
          variableName: recordId === 'step-1' ? 'total' : 'subtotal',
          isOutput: recordId === 'step-1',
        }),
    );

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload(['step-1', 'step-2'], { costTemplateId: 'cost-template-1' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledTimes(2);
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledTimes(1);
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: 'step-1',
    });
  });

  // Regression: updateMany applies the same variableName patch to every
  // matched record — two matched records ending up with the same
  // variableName under the same costTemplateId can't collide against the
  // database, so the hook must catch it itself.
  it('throws on an intra-batch variable name collision', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      isOutput: false,
    });

    await expect(
      hook.execute(
        authContext,
        'costTemplateStep',
        buildPayload(['step-1', 'step-2'], { variableName: 'total' }),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  // Regression: updateMany applies isOutput: true to every matched record —
  // two matched records becoming output steps under the same costTemplateId
  // can't collide against the database, so the hook must catch it itself.
  it('throws on an intra-batch output-step collision', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockImplementation(
      ({ recordId }: { recordId: string }) =>
        Promise.resolve({
          costTemplateId: 'cost-template-1',
          variableName: recordId === 'step-1' ? 'total' : 'subtotal',
          isOutput: true,
        }),
    );

    await expect(
      hook.execute(
        authContext,
        'costTemplateStep',
        buildPayload(['step-1', 'step-2'], { isOutput: true }),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('skips a matched record whose existing row cannot be found', async () => {
    costTemplateValidationService.resolveEffectiveStepState.mockResolvedValue(
      null,
    );

    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload(['missing-step'], { variableName: 'total', isOutput: true }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });
});
