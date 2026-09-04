import { Test } from '@nestjs/testing';

import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { QuoteTotalAmountRollupJob } from 'src/modules/quote/quote-total-amount-rollup/jobs/quote-total-amount-rollup.job';

describe('QuoteTotalAmountRollupJob', () => {
  let job: QuoteTotalAmountRollupJob;
  let quoteLineRepository: { find: jest.Mock };
  let quoteRepository: { update: jest.Mock };
  let getRepositoryMock: jest.Mock;

  beforeEach(async () => {
    quoteLineRepository = { find: jest.fn() };
    quoteRepository = { update: jest.fn() };
    getRepositoryMock = jest.fn((objectMetadataName: string) =>
      objectMetadataName === 'quoteLine'
        ? quoteLineRepository
        : quoteRepository,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuoteTotalAmountRollupJob,
        {
          provide: WorkspaceOrmManager,
          useValue: {
            getRepository: getRepositoryMock,
            executeInWorkspaceContext: jest.fn((fn: () => unknown) => fn()),
          },
        },
      ],
    }).compile();

    // QuoteTotalAmountRollupJob is REQUEST-scoped (see @Processor's `scope`,
    // mirroring WorkflowStatusesUpdateJob) — scoped providers can't be
    // fetched with get(), only resolve().
    job = await moduleRef.resolve(QuoteTotalAmountRollupJob);
  });

  it('sums sibling quoteLine.totalPrice and updates the parent quote.totalAmount', async () => {
    quoteLineRepository.find.mockResolvedValue([
      {
        id: 'line-1',
        quoteId: 'quote-1',
        totalPrice: { amountMicros: 50_000_000, currencyCode: 'USD' },
      },
      {
        id: 'line-2',
        quoteId: 'quote-1',
        totalPrice: { amountMicros: 75_000_000, currencyCode: 'USD' },
      },
    ]);

    await job.handle({ workspaceId: 'workspace-1', quoteIds: ['quote-1'] });

    expect(quoteLineRepository.find).toHaveBeenCalledWith({
      where: { quoteId: 'quote-1' },
    });
    expect(quoteRepository.update).toHaveBeenCalledWith(
      { id: 'quote-1' },
      { totalAmount: { amountMicros: 125_000_000, currencyCode: 'USD' } },
    );
  });

  it('sets totalAmount to 0 when the quote has no lines left (e.g. after the last line is deleted)', async () => {
    quoteLineRepository.find.mockResolvedValue([]);

    await job.handle({ workspaceId: 'workspace-1', quoteIds: ['quote-1'] });

    expect(quoteRepository.update).toHaveBeenCalledWith(
      { id: 'quote-1' },
      { totalAmount: { amountMicros: 0, currencyCode: 'USD' } },
    );
  });

  it('handles multiple quoteIds in one batch event', async () => {
    quoteLineRepository.find.mockImplementation(
      ({ where: { quoteId } }: { where: { quoteId: string } }) =>
        Promise.resolve(
          quoteId === 'quote-1'
            ? [
                {
                  id: 'line-1',
                  quoteId: 'quote-1',
                  totalPrice: { amountMicros: 10_000_000, currencyCode: 'USD' },
                },
              ]
            : [
                {
                  id: 'line-2',
                  quoteId: 'quote-2',
                  totalPrice: { amountMicros: 20_000_000, currencyCode: 'USD' },
                },
              ],
        ),
    );

    await job.handle({
      workspaceId: 'workspace-1',
      quoteIds: ['quote-1', 'quote-2'],
    });

    expect(quoteRepository.update).toHaveBeenCalledWith(
      { id: 'quote-1' },
      { totalAmount: { amountMicros: 10_000_000, currencyCode: 'USD' } },
    );
    expect(quoteRepository.update).toHaveBeenCalledWith(
      { id: 'quote-2' },
      { totalAmount: { amountMicros: 20_000_000, currencyCode: 'USD' } },
    );
    expect(quoteRepository.update).toHaveBeenCalledTimes(2);
  });
});
