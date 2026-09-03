import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type UpdateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldUpdateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-many.pre-query.hook';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

describe('CostTemplateFieldUpdateManyPreQueryHook', () => {
  let hook: CostTemplateFieldUpdateManyPreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    resolveEffectiveFieldState: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    ids: string[],
    data: Partial<CostTemplateFieldWorkspaceEntity>,
  ): UpdateManyResolverArgs<
    CostTemplateFieldWorkspaceEntity,
    { id: { in: string[] } }
  > => ({
    filter: { id: { in: ids } },
    data: data as CostTemplateFieldWorkspaceEntity,
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
      resolveEffectiveFieldState: jest.fn(),
    };

    hook = new CostTemplateFieldUpdateManyPreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('skips validation when the filter does not resolve to a bounded set of ids', async () => {
    await hook.execute(authContext, 'costTemplateField', {
      filter: {},
      data: { name: 'New name' },
    } as unknown as UpdateManyResolverArgs<
      CostTemplateFieldWorkspaceEntity,
      { id: { in: string[] } }
    >);

    expect(
      costTemplateValidationService.resolveEffectiveFieldState,
    ).not.toHaveBeenCalled();
  });

  it('resolves effective state for every matched id and validates each one', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockImplementation(
      ({ recordId }: { recordId: string }) =>
        Promise.resolve({
          costTemplateId: 'cost-template-1',
          variableName: recordId === 'field-1' ? 'quantity' : 'price',
        }),
    );

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload(['field-1', 'field-2'], {
        costTemplateId: 'cost-template-1',
      }),
    );

    expect(
      costTemplateValidationService.resolveEffectiveFieldState,
    ).toHaveBeenCalledTimes(2);
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
      excludeRecordId: 'field-1',
    });
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'price',
      excludeRecordId: 'field-2',
    });
  });

  // Regression: updateMany applies the same variableName patch to every
  // matched record — two matched records ending up with the same
  // variableName under the same costTemplateId can't collide against the
  // database (neither is committed with the new value yet), so the hook
  // must catch it itself.
  it('throws on an intra-batch collision when the same variableName would land on two matched records', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
    });

    await expect(
      hook.execute(
        authContext,
        'costTemplateField',
        buildPayload(['field-1', 'field-2'], { variableName: 'quantity' }),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  it('skips a matched record whose existing row cannot be found', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockResolvedValue(
      null,
    );

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload(['missing-field'], { variableName: 'quantity' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });
});
