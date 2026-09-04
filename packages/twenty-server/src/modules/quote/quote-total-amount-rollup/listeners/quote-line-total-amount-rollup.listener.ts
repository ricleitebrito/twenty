import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import {
  type ObjectRecordCreateEvent,
  type ObjectRecordDeleteEvent,
  type ObjectRecordDestroyEvent,
  type ObjectRecordRestoreEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';
import {
  QuoteTotalAmountRollupJob,
  type QuoteTotalAmountRollupJobData,
} from 'src/modules/quote/quote-total-amount-rollup/jobs/quote-total-amount-rollup.job';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

@Injectable()
export class QuoteLineTotalAmountRollupListener {
  constructor(
    @InjectMessageQueue(MessageQueue.quoteQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  @OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.CREATED)
  async handleQuoteLineCreated(
    batchEvent: CustomWorkspaceEventBatch<
      ObjectRecordCreateEvent<QuoteLineWorkspaceEntity>
    >,
  ): Promise<void> {
    if (!isDefined(batchEvent.workspaceId)) {
      return;
    }

    const quoteIds = batchEvent.events
      .map((event) => event.properties.after.quoteId)
      .filter(isDefined);

    await this.enqueueRollup({
      workspaceId: batchEvent.workspaceId,
      quoteIds,
    });
  }

  @OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.UPDATED)
  async handleQuoteLineUpdated(
    batchEvent: CustomWorkspaceEventBatch<
      ObjectRecordUpdateEvent<QuoteLineWorkspaceEntity>
    >,
  ): Promise<void> {
    if (!isDefined(batchEvent.workspaceId)) {
      return;
    }

    const quoteIds = batchEvent.events
      .filter(
        (event) =>
          event.properties.updatedFields.includes('totalPrice') ||
          event.properties.updatedFields.includes('quoteId'),
      )
      .flatMap((event) => [
        // A reparent (quoteId change) leaves the old parent's total stale
        // too — both the old and new quote need their totals recomputed.
        event.properties.before.quoteId,
        event.properties.after.quoteId,
      ])
      .filter(isDefined);

    await this.enqueueRollup({
      workspaceId: batchEvent.workspaceId,
      quoteIds,
    });
  }

  @OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.DELETED)
  async handleQuoteLineDeleted(
    batchEvent: CustomWorkspaceEventBatch<
      ObjectRecordDeleteEvent<QuoteLineWorkspaceEntity>
    >,
  ): Promise<void> {
    if (!isDefined(batchEvent.workspaceId)) {
      return;
    }

    const quoteIds = batchEvent.events
      .map((event) => event.properties.before.quoteId)
      .filter(isDefined);

    await this.enqueueRollup({
      workspaceId: batchEvent.workspaceId,
      quoteIds,
    });
  }

  @OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.RESTORED)
  async handleQuoteLineRestored(
    batchEvent: CustomWorkspaceEventBatch<
      ObjectRecordRestoreEvent<QuoteLineWorkspaceEntity>
    >,
  ): Promise<void> {
    if (!isDefined(batchEvent.workspaceId)) {
      return;
    }

    const quoteIds = batchEvent.events
      .map((event) => event.properties.after.quoteId)
      .filter(isDefined);

    await this.enqueueRollup({
      workspaceId: batchEvent.workspaceId,
      quoteIds,
    });
  }

  @OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.DESTROYED)
  async handleQuoteLineDestroyed(
    batchEvent: CustomWorkspaceEventBatch<
      ObjectRecordDestroyEvent<QuoteLineWorkspaceEntity>
    >,
  ): Promise<void> {
    if (!isDefined(batchEvent.workspaceId)) {
      return;
    }

    const quoteIds = batchEvent.events
      .map((event) => event.properties.before.quoteId)
      .filter(isDefined);

    await this.enqueueRollup({
      workspaceId: batchEvent.workspaceId,
      quoteIds,
    });
  }

  private async enqueueRollup({
    workspaceId,
    quoteIds,
  }: {
    workspaceId: string;
    quoteIds: string[];
  }): Promise<void> {
    const dedupedQuoteIds = [...new Set(quoteIds)];

    if (dedupedQuoteIds.length === 0) {
      return;
    }

    await this.messageQueueService.add<QuoteTotalAmountRollupJobData>(
      QuoteTotalAmountRollupJob.name,
      {
        workspaceId,
        quoteIds: dedupedQuoteIds,
      },
    );
  }
}
