import { emptyGutachtenInsights } from '../types';

type GutachtenFileLike = {
  id: string;
};

export function getGutachtenInsightsState(input: {
  gutachtenFile: GutachtenFileLike | null;
}) {
  if (!input.gutachtenFile) {
    return emptyGutachtenInsights('NOT_AVAILABLE');
  }

  return emptyGutachtenInsights('AVAILABLE_UNPARSED');
}
