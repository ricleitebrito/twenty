import { Module } from '@nestjs/common';

import { CostTemplateCalculationService } from 'src/modules/quote/cost-template-calculation/services/cost-template-calculation.service';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldCreateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-create-many.pre-query.hook';
import { CostTemplateFieldCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-create-one.pre-query.hook';
import { CostTemplateFieldUpdateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-many.pre-query.hook';
import { CostTemplateFieldUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-one.pre-query.hook';
import { CostTemplateStepCreateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-create-many.pre-query.hook';
import { CostTemplateStepCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-create-one.pre-query.hook';
import { CostTemplateStepUpdateManyPreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-update-many.pre-query.hook';
import { CostTemplateStepUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-update-one.pre-query.hook';
import { QuoteLineCreateManyPreQueryHook } from 'src/modules/quote/query-hooks/quote-line-create-many.pre-query.hook';
import { QuoteLineCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/quote-line-create-one.pre-query.hook';
import { QuoteLineUpdateManyPreQueryHook } from 'src/modules/quote/query-hooks/quote-line-update-many.pre-query.hook';
import { QuoteLineUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/quote-line-update-one.pre-query.hook';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';

@Module({
  providers: [
    CostTemplateValidationService,
    CostTemplateCalculationService,
    QuoteLinePricingService,
    CostTemplateFieldCreateOnePreQueryHook,
    CostTemplateFieldUpdateOnePreQueryHook,
    CostTemplateFieldCreateManyPreQueryHook,
    CostTemplateFieldUpdateManyPreQueryHook,
    CostTemplateStepCreateOnePreQueryHook,
    CostTemplateStepUpdateOnePreQueryHook,
    CostTemplateStepCreateManyPreQueryHook,
    CostTemplateStepUpdateManyPreQueryHook,
    QuoteLineCreateOnePreQueryHook,
    QuoteLineUpdateOnePreQueryHook,
    QuoteLineCreateManyPreQueryHook,
    QuoteLineUpdateManyPreQueryHook,
  ],
})
export class QuoteQueryHookModule {}
