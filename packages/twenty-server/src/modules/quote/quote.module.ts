import { Module } from '@nestjs/common';

import { QuoteTotalAmountRollupModule } from 'src/modules/quote/quote-total-amount-rollup/quote-total-amount-rollup.module';

@Module({
  imports: [QuoteTotalAmountRollupModule],
})
export class QuoteModule {}
