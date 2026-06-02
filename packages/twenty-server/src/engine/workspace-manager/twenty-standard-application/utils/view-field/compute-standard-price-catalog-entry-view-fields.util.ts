import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardPriceCatalogEntryViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'priceCatalogEntry'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allPriceCatalogEntriesUnitPrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalogEntry',
      context: {
        viewName: 'allPriceCatalogEntries',
        viewFieldName: 'unitPrice',
        fieldName: 'unitPrice',
        position: 0,
        isVisible: true,
        size: 150,
      },
    }),
    allPriceCatalogEntriesProduct: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalogEntry',
      context: {
        viewName: 'allPriceCatalogEntries',
        viewFieldName: 'product',
        fieldName: 'product',
        position: 1,
        isVisible: true,
        size: 180,
      },
    }),
    allPriceCatalogEntriesPriceCatalog: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalogEntry',
      context: {
        viewName: 'allPriceCatalogEntries',
        viewFieldName: 'priceCatalog',
        fieldName: 'priceCatalog',
        position: 2,
        isVisible: true,
        size: 180,
      },
    }),
    allPriceCatalogEntriesIsActive: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalogEntry',
      context: {
        viewName: 'allPriceCatalogEntries',
        viewFieldName: 'isActive',
        fieldName: 'isActive',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),
    allPriceCatalogEntriesCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalogEntry',
      context: {
        viewName: 'allPriceCatalogEntries',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
