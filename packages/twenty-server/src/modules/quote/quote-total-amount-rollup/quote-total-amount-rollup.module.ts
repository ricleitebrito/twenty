import { Module } from '@nestjs/common';

import { WorkspaceEventEmitterModule } from 'src/engine/workspace-event-emitter/workspace-event-emitter.module';
import { QuoteTotalAmountRollupJob } from 'src/modules/quote/quote-total-amount-rollup/jobs/quote-total-amount-rollup.job';
import { QuoteLineTotalAmountRollupListener } from 'src/modules/quote/quote-total-amount-rollup/listeners/quote-line-total-amount-rollup.listener';

@Module({
  imports: [WorkspaceEventEmitterModule],
  providers: [QuoteTotalAmountRollupJob, QuoteLineTotalAmountRollupListener],
})
export class QuoteTotalAmountRollupModule {}
