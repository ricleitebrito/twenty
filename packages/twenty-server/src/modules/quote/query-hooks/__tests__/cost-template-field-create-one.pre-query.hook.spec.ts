import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-create-one.pre-query.hook';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

describe('CostTemplateFieldCreateOnePreQueryHook', () => {
  let hook: CostTemplateFieldCreateOnePreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Partial<CostTemplateFieldWorkspaceEntity>,
  ): CreateOneResolverArgs<CostTemplateFieldWorkspaceEntity> => ({
    data: data as CostTemplateFieldWorkspaceEntity,
  });

  beforeEach(() => {
    costTemplateValidationService = {
      validateUniqueVariableNames: jest.fn(),
    };

    hook = new CostTemplateFieldCreateOnePreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  it('validates uniqueness when both costTemplateId and variableName are present', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
      }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
      excludeRecordId: null,
    });
  });

  it('propagates the collision error thrown by the validation service', async () => {
    costTemplateValidationService.validateUniqueVariableNames.mockRejectedValue(
      new Error('collision'),
    );

    await expect(
      hook.execute(
        authContext,
        'costTemplateField',
        buildPayload({
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
        }),
      ),
    ).rejects.toThrow('collision');
  });

  it('does not validate when costTemplateId is missing', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ variableName: 'quantity' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });

  it('does not validate when variableName is missing', async () => {
    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ costTemplateId: 'cost-template-1' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).not.toHaveBeenCalled();
  });
});
