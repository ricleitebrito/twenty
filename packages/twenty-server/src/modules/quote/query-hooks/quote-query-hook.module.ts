import { Module } from '@nestjs/common';

import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-create-one.pre-query.hook';
import { CostTemplateFieldUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-one.pre-query.hook';
import { CostTemplateStepCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-create-one.pre-query.hook';
import { CostTemplateStepUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-update-one.pre-query.hook';

@Module({
  providers: [
    CostTemplateValidationService,
    CostTemplateFieldCreateOnePreQueryHook,
    CostTemplateFieldUpdateOnePreQueryHook,
    CostTemplateStepCreateOnePreQueryHook,
    CostTemplateStepUpdateOnePreQueryHook,
  ],
})
export class QuoteQueryHookModule {}
