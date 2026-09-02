import { Test } from '@nestjs/testing';

import { Not } from 'typeorm';

import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';

describe('CostTemplateValidationService', () => {
  let service: CostTemplateValidationService;
  let costTemplateFieldRepository: { exists: jest.Mock; findOne: jest.Mock };
  let costTemplateStepRepository: { exists: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    costTemplateFieldRepository = { exists: jest.fn(), findOne: jest.fn() };
    costTemplateStepRepository = { exists: jest.fn(), findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CostTemplateValidationService,
        {
          provide: WorkspaceOrmManager,
          useValue: {
            getRepository: jest.fn((objectMetadataName: string) =>
              objectMetadataName === 'costTemplateField'
                ? costTemplateFieldRepository
                : costTemplateStepRepository,
            ),
            executeInWorkspaceContext: jest.fn((fn: () => unknown) => fn()),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CostTemplateValidationService);
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

  describe('resolveExistingCostTemplateId', () => {
    it('returns the costTemplateId from the existing costTemplateField record', async () => {
      costTemplateFieldRepository.findOne.mockResolvedValue({
        id: 'field-1',
        costTemplateId: 'cost-template-1',
      });

      await expect(
        service.resolveExistingCostTemplateId({
          workspaceId: 'workspace-1',
          objectMetadataName: 'costTemplateField',
          recordId: 'field-1',
        }),
      ).resolves.toBe('cost-template-1');

      expect(costTemplateFieldRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'field-1' },
      });
    });

    it('returns the costTemplateId from the existing costTemplateStep record', async () => {
      costTemplateStepRepository.findOne.mockResolvedValue({
        id: 'step-1',
        costTemplateId: 'cost-template-1',
      });

      await expect(
        service.resolveExistingCostTemplateId({
          workspaceId: 'workspace-1',
          objectMetadataName: 'costTemplateStep',
          recordId: 'step-1',
        }),
      ).resolves.toBe('cost-template-1');

      expect(costTemplateStepRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'step-1' },
      });
    });

    it('returns null when the existing record cannot be found', async () => {
      costTemplateFieldRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveExistingCostTemplateId({
          workspaceId: 'workspace-1',
          objectMetadataName: 'costTemplateField',
          recordId: 'missing-field',
        }),
      ).resolves.toBeNull();
    });
  });
});
