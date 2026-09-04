import { type CurrencyMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

// Twenty has no workspace- or quote-level currency setting yet (confirmed:
// no such field exists anywhere in the codebase), so this is the fallback
// used whenever a QuoteLine's price is written without an existing
// CurrencyMetadata to inherit a currencyCode from. Revisit if/when Quote or
// the workspace gains its own currency setting.
export const DEFAULT_QUOTE_LINE_CURRENCY_CODE = 'USD';

// CurrencyMetadata.amountMicros stores the amount scaled by 1e6 (see
// twenty-shared's currency composite type and e.g.
// generate-random-field-value.util.ts's `amountMicros: amount * 1_000_000`).
// QuoteLinePricingService and CostTemplateCalculationService both work in
// plain major-unit numbers — a cost template formula like `seats * 10`
// produces a dollar amount, not a micros amount, and CURRENCY-typed cost
// template fields are coerced as plain numbers too (see
// coerceCostTemplateFieldValues) — so this is the boundary where the two
// domains are converted.
const MICROS_PER_UNIT = 1_000_000;

export const currencyMetadataToAmount = (
  currency: CurrencyMetadata | null | undefined,
): number | undefined =>
  isDefined(currency) ? currency.amountMicros / MICROS_PER_UNIT : undefined;

export const amountToCurrencyMetadata = (
  amount: number,
  currencyCode: string,
): CurrencyMetadata => ({
  amountMicros: Math.round(amount * MICROS_PER_UNIT),
  currencyCode,
});
