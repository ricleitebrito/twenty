import { QuoteLineTotalAmountRollupListener } from 'src/modules/quote/quote-total-amount-rollup/listeners/quote-line-total-amount-rollup.listener';

describe('QuoteLineTotalAmountRollupListener', () => {
  let listener: QuoteLineTotalAmountRollupListener;
  let messageQueueServiceAdd: jest.Mock;

  beforeEach(() => {
    messageQueueServiceAdd = jest.fn().mockResolvedValue(undefined);

    listener = new QuoteLineTotalAmountRollupListener({
      add: messageQueueServiceAdd,
    } as never);
  });

  describe('handleQuoteLineCreated', () => {
    it('enqueues a rollup for the created line\'s quote', async () => {
      await listener.handleQuoteLineCreated({
        workspaceId: 'workspace-1',
        events: [
          { properties: { after: { quoteId: 'quote-1' } } },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        { workspaceId: 'workspace-1', quoteIds: ['quote-1'] },
      );
    });

    it('does nothing when workspaceId is not defined', async () => {
      await listener.handleQuoteLineCreated({
        workspaceId: undefined,
        events: [{ properties: { after: { quoteId: 'quote-1' } } }],
      } as never);

      expect(messageQueueServiceAdd).not.toHaveBeenCalled();
    });
  });

  describe('handleQuoteLineUpdated', () => {
    it('enqueues a rollup for the quote when totalPrice changes (non-reparent)', async () => {
      await listener.handleQuoteLineUpdated({
        workspaceId: 'workspace-1',
        events: [
          {
            properties: {
              before: { quoteId: 'quote-1' },
              after: { quoteId: 'quote-1' },
              updatedFields: ['totalPrice'],
            },
          },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        { workspaceId: 'workspace-1', quoteIds: ['quote-1'] },
      );
    });

    it('enqueues a rollup for BOTH the old and new quote on reparent', async () => {
      await listener.handleQuoteLineUpdated({
        workspaceId: 'workspace-1',
        events: [
          {
            properties: {
              before: { quoteId: 'quote-1' },
              after: { quoteId: 'quote-2' },
              updatedFields: ['quoteId'],
            },
          },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        {
          workspaceId: 'workspace-1',
          quoteIds: ['quote-1', 'quote-2'],
        },
      );
    });

    it('does nothing when neither totalPrice nor quoteId changed', async () => {
      await listener.handleQuoteLineUpdated({
        workspaceId: 'workspace-1',
        events: [
          {
            properties: {
              before: { quoteId: 'quote-1' },
              after: { quoteId: 'quote-1' },
              updatedFields: ['name'],
            },
          },
        ],
      } as never);

      expect(messageQueueServiceAdd).not.toHaveBeenCalled();
    });
  });

  describe('handleQuoteLineDeleted', () => {
    it("enqueues a rollup for the deleted line's quote", async () => {
      await listener.handleQuoteLineDeleted({
        workspaceId: 'workspace-1',
        events: [
          { properties: { before: { quoteId: 'quote-1' } } },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        { workspaceId: 'workspace-1', quoteIds: ['quote-1'] },
      );
    });
  });

  describe('handleQuoteLineRestored', () => {
    it("enqueues a rollup for the restored line's quote", async () => {
      await listener.handleQuoteLineRestored({
        workspaceId: 'workspace-1',
        events: [
          {
            properties: {
              before: { quoteId: 'quote-1' },
              after: { quoteId: 'quote-1' },
              updatedFields: ['deletedAt'],
            },
          },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        { workspaceId: 'workspace-1', quoteIds: ['quote-1'] },
      );
    });

    it('dedupes quoteIds across multiple restored lines in the same batch', async () => {
      await listener.handleQuoteLineRestored({
        workspaceId: 'workspace-1',
        events: [
          {
            properties: {
              before: { quoteId: 'quote-1' },
              after: { quoteId: 'quote-1' },
              updatedFields: ['deletedAt'],
            },
          },
          {
            properties: {
              before: { quoteId: 'quote-1' },
              after: { quoteId: 'quote-1' },
              updatedFields: ['deletedAt'],
            },
          },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        { workspaceId: 'workspace-1', quoteIds: ['quote-1'] },
      );
      expect(messageQueueServiceAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleQuoteLineDestroyed', () => {
    it("enqueues a rollup for the destroyed line's quote", async () => {
      await listener.handleQuoteLineDestroyed({
        workspaceId: 'workspace-1',
        events: [
          { properties: { before: { quoteId: 'quote-1' } } },
        ],
      } as never);

      expect(messageQueueServiceAdd).toHaveBeenCalledWith(
        'QuoteTotalAmountRollupJob',
        { workspaceId: 'workspace-1', quoteIds: ['quote-1'] },
      );
    });

    it('does nothing when workspaceId is not defined', async () => {
      await listener.handleQuoteLineDestroyed({
        workspaceId: undefined,
        events: [{ properties: { before: { quoteId: 'quote-1' } } }],
      } as never);

      expect(messageQueueServiceAdd).not.toHaveBeenCalled();
    });
  });
});
