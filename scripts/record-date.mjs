// Screenshot publication is an explicit archive date policy, not a claim
// about the earlier moment at which the race was completed.
export function screenshotPublicationDate(record) {
  if (!record.proofImageVerified || !(record.proofImageLocal || record.proofImage)) return null;
  const values = [record.evidencePublishedAt, record.observedAt, record.submittedAt]
    .filter(value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value));
  return values.sort()[0]?.slice(0, 10) || null;
}
