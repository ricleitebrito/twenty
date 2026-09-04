import { ViewKey, ViewType } from 'twenty-shared/types';

import { INDEX_VIEW_NAME } from 'src/engine/metadata-modules/view/constants/index-view-name.constant';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardQuoteViews = (
  args: Omit<CreateStandardViewArgs<'quote'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allQuotes: createStandardViewFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'allQuotes',
        name: INDEX_VIEW_NAME,
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconFileText',
      },
    }),
    quoteRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        name: 'Quote Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
