export const observations = { timeouts: 0, validationErrors: [] as string[], viableTemplates: 0, totalTemplates: 0 };
export function resetObservations() {
  observations.timeouts = 0;
  observations.validationErrors = [];
  observations.viableTemplates = 0;
  observations.totalTemplates = 0;
}
