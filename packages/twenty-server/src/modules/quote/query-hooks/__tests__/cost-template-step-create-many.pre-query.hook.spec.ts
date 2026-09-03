import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateStepCreateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-create-many.pre-query.hook';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

describe('CostTemplateStepCreateManyPreQueryHook', () => {
  let hook: CostTemplateStepCreateManyPreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    validateSingleOutputStep: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Array<Partial<CostTemplateStepWorkspaceEntity>>,
  ): CreateManyResolverArgs<CostTemplateStepWorkspaceEntity> => ({
    data: data as CostTemplateStepWorkspaceEntity[],
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
      validateSingleOutputStep: jest.fn(),
    };

    hook = new CostTemplateStepCreateManyPreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('validates every record that has both costTemplateId and variableName', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload([
        { costTemplateId: 'cost-template-1', variableName: 'total' },
        { costTemplateId: 'cost-template-1', variableName: 'subtotal' },
      ]),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledTimes(2);
  });

  // Regression: two records in the same createMany payload sharing a
  // variableName under the same costTemplateId can't collide against the
  // database (neither exists yet), so the hook must catch it itself.
  it('throws on an intra-batch variable name collision without hitting the database', async () => {
    await expect(
      hook.execute(
        authContext,
        'costTemplateStep',
        buildPayload([
          { costTemplateId: 'cost-template-1', variableName: 'total' },
          { costTemplateId: 'cost-template-1', variableName: 'total' },
        ]),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  // Regression: same as above but for the single-output-step invariant —
  // two isOutput: true records for the same template in one batch can't
  // collide against the database either.
  it('throws on an intra-batch output-step collision without hitting the database', async () => {
    await expect(
      hook.execute(
        authContext,
        'costTemplateStep',
        buildPayload([
          {
            costTemplateId: 'cost-template-1',
            variableName: 'total',
            isOutput: true,
          },
          {
            costTemplateId: 'cost-template-1',
            variableName: 'grandTotal',
            isOutput: true,
          },
        ]),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).not.toHaveBeenCalled();
  });

  it('validates the output invariant only for records with isOutput: true', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload([
        {
          costTemplateId: 'cost-template-1',
          variableName: 'total',
          isOutput: true,
        },
        {
          costTemplateId: 'cost-template-1',
          variableName: 'subtotal',
          isOutput: false,
        },
      ]),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledTimes(1);
    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: null,
    });
  });

  it('does not flag two output steps under different cost templates', async () => {
    await hook.execute(
      authContext,
      'costTemplateStep',
      buildPayload([
        {
          costTemplateId: 'cost-template-1',
          variableName: 'total',
          isOutput: true,
        },
        {
          costTemplateId: 'cost-template-2',
          variableName: 'total',
          isOutput: true,
        },
      ]),
    );

    expect(
      costTemplateValidationService.validateSingleOutputStep,
    ).toHaveBeenCalledTimes(2);
  });
});
