import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldCreateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-create-many.pre-query.hook';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

describe('CostTemplateFieldCreateManyPreQueryHook', () => {
  let hook: CostTemplateFieldCreateManyPreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Array<Partial<CostTemplateFieldWorkspaceEntity>>,
  ): CreateManyResolverArgs<CostTemplateFieldWorkspaceEntity> => ({
    data: data as CostTemplateFieldWorkspaceEntity[],
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
    };

    hook = new CostTemplateFieldCreateManyPreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('validates every record that has both costTemplateId and variableName', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload([
        { costTemplateId: 'cost-template-1', variableName: 'quantity' },
        { costTemplateId: 'cost-template-1', variableName: 'price' },
      ]),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledTimes(2);
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
      excludeRecordId: null,
    });
    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'price',
      excludeRecordId: null,
    });
  });

  it('skips records missing costTemplateId or variableName', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload([
        { variableName: 'quantity' },
        { costTemplateId: 'cost-template-1' },
      ]),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  // Regression: two records in the same createMany payload sharing a
  // variableName under the same costTemplateId can't collide against the
  // database (neither exists yet), so the hook must catch it itself.
  it('throws on an intra-batch variable name collision without hitting the database', async () => {
    await expect(
      hook.execute(
        authContext,
        'costTemplateField',
        buildPayload([
          { costTemplateId: 'cost-template-1', variableName: 'quantity' },
          { costTemplateId: 'cost-template-1', variableName: 'quantity' },
        ]),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  it('does not flag the same variableName used under different cost templates', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload([
        { costTemplateId: 'cost-template-1', variableName: 'quantity' },
        { costTemplateId: 'cost-template-2', variableName: 'quantity' },
      ]),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledTimes(2);
  });
});
