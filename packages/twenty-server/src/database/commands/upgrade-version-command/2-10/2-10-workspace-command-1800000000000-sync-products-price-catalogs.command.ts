import { Command } from 'nest-commander';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { TwentyStandardApplicationService } from 'src/engine/workspace-manager/twenty-standard-application/services/twenty-standard-application.service';

// Re-synchronizes the twenty-standard application for every existing workspace so that the
// Product, Price Catalog and Price Catalog Entry standard objects are added to their metadata
// and schema. The sync is diff-based and incremental — existing tables and data are preserved.
@RegisteredWorkspaceCommand('2.10.0', 1800000000000)
@Command({
  name: 'upgrade:2-10:sync-products-price-catalogs',
  description:
    'Add the Product, Price Catalog and Price Catalog Entry standard objects to existing workspaces',
})
export class SyncProductsPriceCatalogsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly twentyStandardApplicationService: TwentyStandardApplicationService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    if (options.dryRun ?? false) {
      this.logger.log(
        `[dry-run] Would synchronize twenty-standard application for workspace ${workspaceId}`,
      );

      return;
    }

    await this.twentyStandardApplicationService.synchronizeTwentyStandardApplicationOrThrow(
      {
        workspaceId,
      },
    );
  }
}
