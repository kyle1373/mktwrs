// Screenshot publication is an explicit archive date policy, not a claim
// about the earlier moment at which the race was completed.
export function screenshotPublicationDate(record) {
  if (!record.proofImageVerified || !(record.proofImageLocal || record.proofImage)) return null;
  const values = [record.evidencePublishedAt, record.observedAt, record.submittedAt]
    .filter(value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value));
  const day = values.sort()[0]?.slice(0, 10) || null;
  // A later repost must not date an intermediate record after its verified
  // successor. Retain publication metadata, but keep the record date unknown.
  const latestPossibleDay = record.achievementDateBounds?.notAfter?.slice(0, 10);
  if (day && latestPossibleDay && day > latestPossibleDay) return null;
  return day;
}
