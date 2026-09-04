import { Logger, Scope } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { DEFAULT_QUOTE_LINE_CURRENCY_CODE } from 'src/modules/quote/quote-line-pricing/utils/quote-line-currency-metadata.util';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';
import { type QuoteWorkspaceEntity } from 'src/modules/quote/standard-objects/quote.workspace-entity';

export type QuoteTotalAmountRollupJobData = {
  workspaceId: string;
  quoteIds: string[];
};

@Processor({ queueName: MessageQueue.quoteQueue, scope: Scope.REQUEST })
export class QuoteTotalAmountRollupJob {
  protected readonly logger = new Logger(QuoteTotalAmountRollupJob.name);

  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  @Process(QuoteTotalAmountRollupJob.name)
  async handle(data: QuoteTotalAmountRollupJobData): Promise<void> {
    const authContext = buildSystemAuthContext(data.workspaceId);

    await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      await Promise.all(
        data.quoteIds.map((quoteId) =>
          this.rollUpQuoteTotalAmount({ quoteId }),
        ),
      );
    }, authContext);
  }

  private async rollUpQuoteTotalAmount({
    quoteId,
  }: {
    quoteId: string;
  }): Promise<void> {
    const quoteLineRepository =
      this.workspaceOrmManager.getRepository<QuoteLineWorkspaceEntity>(
        'quoteLine',
        { shouldBypassPermissionChecks: true },
      );

    const quoteRepository =
      this.workspaceOrmManager.getRepository<QuoteWorkspaceEntity>('quote', {
        shouldBypassPermissionChecks: true,
      });

    // Non-deleted siblings only — find() excludes soft-deleted rows by
    // default, so a just-deleted QuoteLine never contributes to the sum.
    const quoteLines = await quoteLineRepository.find({
      where: { quoteId },
    });

    const totalAmountMicros = quoteLines.reduce(
      (sum, quoteLine) => sum + (quoteLine.totalPrice?.amountMicros ?? 0),
      0,
    );

    // Twenty has no workspace- or quote-level currency setting (see
    // quote-line-currency-metadata.util.ts), so the rollup inherits whichever
    // currencyCode its sibling lines are priced in, falling back to the same
    // default those lines themselves fall back to when none remain.
    const currencyCode =
      quoteLines.find((quoteLine) => isDefined(quoteLine.totalPrice))
        ?.totalPrice?.currencyCode ?? DEFAULT_QUOTE_LINE_CURRENCY_CODE;

    await quoteRepository.update(
      { id: quoteId },
      { totalAmount: { amountMicros: totalAmountMicros, currencyCode } },
    );
  }
}
