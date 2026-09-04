import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('Quote standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the quote object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[STANDARD_OBJECTS.quote.universalIdentifier],
    ).toBeDefined();
  });

  it('builds the quote object with all 9 custom fields and 8 system fields', () => {
    const quoteObject =
      allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quote.universalIdentifier
      ];

    const fieldsOnQuote = Object.values(
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter((field) => field.objectMetadataId === quoteObject?.id)
      .map((field) => field.name);

    expect(fieldsOnQuote).toHaveLength(17);
    expect(fieldsOnQuote).toEqual(
      expect.arrayContaining([
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'createdBy',
        'updatedBy',
        'position',
        'searchVector',
        'name',
        'status',
        'opportunity',
        'company',
        'person',
        'validUntil',
        'totalAmount',
        'attachments',
        'quoteLines',
      ]),
    );
  });

  it('has a status field with exactly 7 options with the expected values', () => {
    const statusField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quote.fields.status.universalIdentifier
      ];

    expect(statusField).toBeDefined();
    expect(statusField?.options).toHaveLength(7);
    expect(statusField?.options?.map((option) => option.value)).toEqual([
      'DRAFT',
      'IN_REVIEW',
      'APPROVED',
      'SENT',
      'ACCEPTED',
      'REJECTED',
      'EXPIRED',
    ]);
  });

  it('builds the allQuotes and quoteRecordPageFields views with the expected view-field counts', () => {
    const allQuotesViewFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.quote.views.allQuotes.universalIdentifier,
      );

    expect(allQuotesViewFieldUniversalIdentifiers).toHaveLength(4);

    const quoteRecordPageFieldsViewFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.quote.views.quoteRecordPageFields
            .universalIdentifier,
      );

    expect(quoteRecordPageFieldsViewFieldUniversalIdentifiers).toHaveLength(12);
  });

  // Regression: guards against a declared-but-never-built view field (Phase 1's I3 class of bug).
  it('instantiates every declared quoteRecordPageFields view field', () => {
    const declaredViewFieldNames = Object.keys(
      STANDARD_OBJECTS.quote.views.quoteRecordPageFields.viewFields,
    );

    const builtFieldMetadataUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.quote.views.quoteRecordPageFields
            .universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    const declaredFieldMetadataUniversalIdentifiers =
      declaredViewFieldNames.map(
        (viewFieldName) =>
          STANDARD_OBJECTS.quote.fields[
            viewFieldName as keyof typeof STANDARD_OBJECTS.quote.fields
          ].universalIdentifier,
      );

    expect(builtFieldMetadataUniversalIdentifiers).toHaveLength(
      declaredFieldMetadataUniversalIdentifiers.length,
    );
    expect(builtFieldMetadataUniversalIdentifiers).toEqual(
      expect.arrayContaining(declaredFieldMetadataUniversalIdentifiers),
    );

    expect(declaredViewFieldNames).not.toContain('name');
  });

  it("has an attachment targetQuote field that is a MORPH_RELATION on the same morphId as targetOpportunity, targeting quote's attachments field", () => {
    const targetQuoteField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.attachment.fields.targetQuote.universalIdentifier
      ];
    const targetOpportunityField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.attachment.fields.targetOpportunity.universalIdentifier
      ];

    expect(targetQuoteField).toBeDefined();
    expect(targetQuoteField?.type).toBe(FieldMetadataType.MORPH_RELATION);
    expect(targetQuoteField?.morphId).toBeDefined();
    expect(targetQuoteField?.morphId).toEqual(targetOpportunityField?.morphId);
    expect(
      targetQuoteField?.relationTargetFieldMetadataUniversalIdentifier,
    ).toBe(STANDARD_OBJECTS.quote.fields.attachments.universalIdentifier);
  });

  it("has a quote attachments field as the reverse ONE_TO_MANY targeting attachment's targetQuote field", () => {
    const attachmentsField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quote.fields.attachments.universalIdentifier
      ];

    expect(attachmentsField).toBeDefined();
    expect(attachmentsField?.type).toBe(FieldMetadataType.RELATION);
    expect(
      attachmentsField?.relationTargetFieldMetadataUniversalIdentifier,
    ).toBe(STANDARD_OBJECTS.attachment.fields.targetQuote.universalIdentifier);
  });
});
