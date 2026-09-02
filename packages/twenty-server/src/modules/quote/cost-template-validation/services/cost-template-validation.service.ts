import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { Not } from 'typeorm';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

type ValidateUniqueVariableNamesArgs = {
  workspaceId: string;
  costTemplateId: string;
  variableName: string;
  excludeRecordId: string | null;
};

type ValidateSingleOutputStepArgs = {
  workspaceId: string;
  costTemplateId: string;
  excludeRecordId: string | null;
};

@Injectable()
export class CostTemplateValidationService {
  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  async validateUniqueVariableNames({
    workspaceId,
    costTemplateId,
    variableName,
    excludeRecordId,
  }: ValidateUniqueVariableNamesArgs): Promise<void> {
    const authContext = buildSystemAuthContext(workspaceId);

    const variableNameAlreadyUsed =
      await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
        const costTemplateFieldRepository =
          this.workspaceOrmManager.getRepository<CostTemplateFieldWorkspaceEntity>(
            'costTemplateField',
            { shouldBypassPermissionChecks: true },
          );
        const costTemplateStepRepository =
          this.workspaceOrmManager.getRepository<CostTemplateStepWorkspaceEntity>(
            'costTemplateStep',
            { shouldBypassPermissionChecks: true },
          );

        const [fieldUsesVariableName, stepUsesVariableName] = await Promise.all(
          [
            costTemplateFieldRepository.exists({
              where: {
                costTemplateId,
                variableName,
                ...(excludeRecordId ? { id: Not(excludeRecordId) } : {}),
              },
            }),
            costTemplateStepRepository.exists({
              where: {
                costTemplateId,
                variableName,
                ...(excludeRecordId ? { id: Not(excludeRecordId) } : {}),
              },
            }),
          ],
        );

        return fieldUsesVariableName || stepUsesVariableName;
      }, authContext);

    if (variableNameAlreadyUsed) {
      throw new CommonQueryRunnerException(
        `Variable name "${variableName}" is already used by another field or step on this cost template`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This variable name is already used by another field or step on this cost template.`,
        },
      );
    }
  }

  async validateSingleOutputStep({
    workspaceId,
    costTemplateId,
    excludeRecordId,
  }: ValidateSingleOutputStepArgs): Promise<void> {
    const authContext = buildSystemAuthContext(workspaceId);

    const otherOutputStepExists =
      await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
        const costTemplateStepRepository =
          this.workspaceOrmManager.getRepository<CostTemplateStepWorkspaceEntity>(
            'costTemplateStep',
            { shouldBypassPermissionChecks: true },
          );

        return costTemplateStepRepository.exists({
          where: {
            costTemplateId,
            isOutput: true,
            ...(excludeRecordId ? { id: Not(excludeRecordId) } : {}),
          },
        });
      }, authContext);

    if (otherOutputStepExists) {
      throw new CommonQueryRunnerException(
        `Cost template ${costTemplateId} already has an output step`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This cost template already has an output step. Unmark the existing one before setting a new one.`,
        },
      );
    }
  }
}
