import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-one.pre-query.hook';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';

describe('CostTemplateFieldUpdateOnePreQueryHook', () => {
  let hook: CostTemplateFieldUpdateOnePreQueryHook;
  let costTemplateValidationService: {
    validateUniqueVariableNames: jest.Mock;
    resolveEffectiveFieldState: jest.Mock;
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
      resolveEffectiveFieldState: jest.fn(),
    };

    hook = new CostTemplateFieldUpdateOnePreQueryHook(
      costTemplateValidationService as unknown as CostTemplateValidationService,
    );
  });

  // Regression: an earlier version only fetched the existing record and
  // validated when variableName was part of the payload, which skipped
  // validation entirely for a reparent (costTemplateId changes, variableName
  // doesn't). The hook must always resolve effective state and validate.
  it('always resolves the effective state and validates, even when the update touches an unrelated field', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
    });

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ name: 'New name' }),
    );

    expect(
      costTemplateValidationService.resolveEffectiveFieldState,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      recordId: 'field-1',
      costTemplateId: undefined,
      variableName: undefined,
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

  it('validates using the effective costTemplateId/variableName from the payload', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockResolvedValue({
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
    });

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
      }),
    );

    expect(
      costTemplateValidationService.resolveEffectiveFieldState,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      recordId: 'field-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
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

  // Regression: reparenting into a template that already has a colliding
  // variableName must be caught even though variableName itself isn't part
  // of this update's payload.
  it('validates a reparent-only update against the target template using the existing variableName', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockResolvedValue({
      costTemplateId: 'cost-template-2',
      variableName: 'quantity',
    });

    await hook.execute(
      authContext,
      'costTemplateField',
      buildPayload({ costTemplateId: 'cost-template-2' }),
    );

    expect(
      costTemplateValidationService.validateUniqueVariableNames,
    ).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-2',
      variableName: 'quantity',
      excludeRecordId: 'field-1',
    });
  });

  it('skips validation when the existing record cannot be found', async () => {
    costTemplateValidationService.resolveEffectiveFieldState.mockResolvedValue(
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
