import { Module } from '@nestjs/common';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { SyncProductsPriceCatalogsCommand } from 'src/database/commands/upgrade-version-command/2-10/2-10-workspace-command-1800000000000-sync-products-price-catalogs.command';
import { TwentyStandardApplicationModule } from 'src/engine/workspace-manager/twenty-standard-application/twenty-standard-application.module';

@Module({
  imports: [WorkspaceIteratorModule, TwentyStandardApplicationModule],
  providers: [SyncProductsPriceCatalogsCommand],
})
export class V2_10_UpgradeVersionCommandModule {}
