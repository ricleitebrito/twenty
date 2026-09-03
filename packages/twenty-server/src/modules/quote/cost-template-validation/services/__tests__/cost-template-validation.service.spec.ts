import { Test } from '@nestjs/testing';

import { Not } from 'typeorm';

import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';

describe('CostTemplateValidationService', () => {
  let service: CostTemplateValidationService;
  let costTemplateFieldRepository: { exists: jest.Mock; findOne: jest.Mock };
  let costTemplateStepRepository: { exists: jest.Mock; findOne: jest.Mock };
  let getRepositoryMock: jest.Mock;

  beforeEach(async () => {
    costTemplateFieldRepository = { exists: jest.fn(), findOne: jest.fn() };
    costTemplateStepRepository = { exists: jest.fn(), findOne: jest.fn() };
    getRepositoryMock = jest.fn((objectMetadataName: string) =>
      objectMetadataName === 'costTemplateField'
        ? costTemplateFieldRepository
        : costTemplateStepRepository,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        CostTemplateValidationService,
        {
          provide: WorkspaceOrmManager,
          useValue: {
            getRepository: getRepositoryMock,
            executeInWorkspaceContext: jest.fn((fn: () => unknown) => fn()),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CostTemplateValidationService);
  });

  // Regression: getRepository's shouldBypassPermissionChecks flag is what
  // makes this a real uniqueness check rather than one scoped to the
  // calling user's permissions — dropping it silently narrows every
  // validation query and would let permission-restricted collisions slip
  // through undetected.
  it('always bypasses permission checks when reading for validation', async () => {
    costTemplateFieldRepository.exists.mockResolvedValue(false);
    costTemplateStepRepository.exists.mockResolvedValue(false);
    costTemplateFieldRepository.findOne.mockResolvedValue({
      id: 'field-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
    });
    costTemplateStepRepository.findOne.mockResolvedValue({
      id: 'step-1',
      costTemplateId: 'cost-template-1',
      variableName: 'total',
      isOutput: false,
    });

    await service.validateUniqueVariableNames({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      variableName: 'quantity',
      excludeRecordId: null,
    });
    await service.validateSingleOutputStep({
      workspaceId: 'workspace-1',
      costTemplateId: 'cost-template-1',
      excludeRecordId: null,
    });
    await service.resolveEffectiveFieldState({
      workspaceId: 'workspace-1',
      recordId: 'field-1',
    });
    await service.resolveEffectiveStepState({
      workspaceId: 'workspace-1',
      recordId: 'step-1',
    });

    expect(getRepositoryMock).toHaveBeenCalledWith('costTemplateField', {
      shouldBypassPermissionChecks: true,
    });
    expect(getRepositoryMock).toHaveBeenCalledWith('costTemplateStep', {
      shouldBypassPermissionChecks: true,
    });
    getRepositoryMock.mock.calls.forEach((call) => {
      expect(call[1]).toEqual({ shouldBypassPermissionChecks: true });
    });
  });

  describe('validateUniqueVariableNames', () => {
    it('throws when another field on the same cost template already uses the variable name', async () => {
      costTemplateFieldRepository.exists.mockResolvedValue(true);
      costTemplateStepRepository.exists.mockResolvedValue(false);

      await expect(
        service.validateUniqueVariableNames({
          workspaceId: 'workspace-1',
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
          excludeRecordId: null,
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('throws when another step on the same cost template already uses the variable name', async () => {
      costTemplateFieldRepository.exists.mockResolvedValue(false);
      costTemplateStepRepository.exists.mockResolvedValue(true);

      await expect(
        service.validateUniqueVariableNames({
          workspaceId: 'workspace-1',
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
          excludeRecordId: null,
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('passes when the variable name is unused in the cost template', async () => {
      costTemplateFieldRepository.exists.mockResolvedValue(false);
      costTemplateStepRepository.exists.mockResolvedValue(false);

      await expect(
        service.validateUniqueVariableNames({
          workspaceId: 'workspace-1',
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
          excludeRecordId: null,
        }),
      ).resolves.not.toThrow();
    });

    it('excludes the record being updated from the collision check', async () => {
      costTemplateFieldRepository.exists.mockResolvedValue(false);
      costTemplateStepRepository.exists.mockResolvedValue(false);

      await service.validateUniqueVariableNames({
        workspaceId: 'workspace-1',
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
        excludeRecordId: 'field-being-updated',
      });

      expect(costTemplateFieldRepository.exists).toHaveBeenCalledWith({
        where: {
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
          id: Not('field-being-updated'),
        },
      });
    });

    it('does not scope the query by id when there is no record to exclude', async () => {
      costTemplateFieldRepository.exists.mockResolvedValue(false);
      costTemplateStepRepository.exists.mockResolvedValue(false);

      await service.validateUniqueVariableNames({
        workspaceId: 'workspace-1',
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
        excludeRecordId: null,
      });

      expect(costTemplateFieldRepository.exists).toHaveBeenCalledWith({
        where: {
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
        },
      });
    });
  });

  describe('validateSingleOutputStep', () => {
    it('throws when another step on the same cost template is already the output', async () => {
      costTemplateStepRepository.exists.mockResolvedValue(true);

      await expect(
        service.validateSingleOutputStep({
          workspaceId: 'workspace-1',
          costTemplateId: 'cost-template-1',
          excludeRecordId: null,
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('passes when no other step on the cost template is the output', async () => {
      costTemplateStepRepository.exists.mockResolvedValue(false);

      await expect(
        service.validateSingleOutputStep({
          workspaceId: 'workspace-1',
          costTemplateId: 'cost-template-1',
          excludeRecordId: null,
        }),
      ).resolves.not.toThrow();
    });

    it('excludes the record being updated from the collision check', async () => {
      costTemplateStepRepository.exists.mockResolvedValue(false);

      await service.validateSingleOutputStep({
        workspaceId: 'workspace-1',
        costTemplateId: 'cost-template-1',
        excludeRecordId: 'step-being-updated',
      });

      expect(costTemplateStepRepository.exists).toHaveBeenCalledWith({
        where: {
          costTemplateId: 'cost-template-1',
          isOutput: true,
          id: Not('step-being-updated'),
        },
      });
    });
  });

  describe('resolveEffectiveFieldState', () => {
    it('falls back to the existing record for whichever of costTemplateId/variableName is absent from the call', async () => {
      costTemplateFieldRepository.findOne.mockResolvedValue({
        id: 'field-1',
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
      });

      await expect(
        service.resolveEffectiveFieldState({
          workspaceId: 'workspace-1',
          recordId: 'field-1',
          costTemplateId: 'cost-template-2',
        }),
      ).resolves.toEqual({
        costTemplateId: 'cost-template-2',
        variableName: 'quantity',
      });

      expect(costTemplateFieldRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'field-1' },
      });
    });

    it('uses the payload values for both fields when both are given', async () => {
      costTemplateFieldRepository.findOne.mockResolvedValue({
        id: 'field-1',
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
      });

      await expect(
        service.resolveEffectiveFieldState({
          workspaceId: 'workspace-1',
          recordId: 'field-1',
          costTemplateId: 'cost-template-2',
          variableName: 'price',
        }),
      ).resolves.toEqual({
        costTemplateId: 'cost-template-2',
        variableName: 'price',
      });
    });

    it('returns null when the existing record cannot be found', async () => {
      costTemplateFieldRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveEffectiveFieldState({
          workspaceId: 'workspace-1',
          recordId: 'missing-field',
        }),
      ).resolves.toBeNull();
    });
  });

  describe('resolveEffectiveStepState', () => {
    it('falls back to the existing record for whichever of costTemplateId/variableName/isOutput is absent from the call', async () => {
      costTemplateStepRepository.findOne.mockResolvedValue({
        id: 'step-1',
        costTemplateId: 'cost-template-1',
        variableName: 'total',
        isOutput: true,
      });

      await expect(
        service.resolveEffectiveStepState({
          workspaceId: 'workspace-1',
          recordId: 'step-1',
          costTemplateId: 'cost-template-2',
        }),
      ).resolves.toEqual({
        costTemplateId: 'cost-template-2',
        variableName: 'total',
        isOutput: true,
      });

      expect(costTemplateStepRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'step-1' },
      });
    });

    it('uses the payload values for every field when all are given', async () => {
      costTemplateStepRepository.findOne.mockResolvedValue({
        id: 'step-1',
        costTemplateId: 'cost-template-1',
        variableName: 'total',
        isOutput: false,
      });

      await expect(
        service.resolveEffectiveStepState({
          workspaceId: 'workspace-1',
          recordId: 'step-1',
          costTemplateId: 'cost-template-2',
          variableName: 'grandTotal',
          isOutput: true,
        }),
      ).resolves.toEqual({
        costTemplateId: 'cost-template-2',
        variableName: 'grandTotal',
        isOutput: true,
      });
    });

    it('returns null when the existing record cannot be found', async () => {
      costTemplateStepRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveEffectiveStepState({
          workspaceId: 'workspace-1',
          recordId: 'missing-step',
        }),
      ).resolves.toBeNull();
    });
  });
});
