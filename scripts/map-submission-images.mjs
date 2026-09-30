import fs from "node:fs";

// Build a review queue from tt-submission only. Date matches narrow the course
// choices; they never establish the course, run time, or WR status on their own.
const read = (path) => JSON.parse(fs.readFileSync(path));
const courses = read("public/data/courses.json");
const tours = read("public/data/tours.json");
const assets = read("archive/assets-manifest.json");
const curated = read("archive/curated-runs.json");
const messages = new Map();
for (const file of fs.readdirSync("archive/raw").sort()) {
  if (!/^tt-submission-\d+\.json$/.test(file)) continue;
  for (const message of read("archive/raw/" + file).messages) {
    const previous = messages.get(message.id);
    messages.set(message.id, {
      ...message,
      links: [...(previous?.links || []), ...(message.links || [])],
      images: [...(previous?.images || []), ...(message.images || [])],
    });
  }
}
const attachmentKey = (url) => {
  try {
    const u = new URL(url);
    if (!["cdn.discordapp.com", "media.discordapp.net"].includes(u.hostname)) return null;
    return u.pathname.match(/^\/attachments\/\d+\/(\d+)\//)?.[1] || null;
  } catch { return null; }
};
const known = new Map();
for (const course of courses) {
  for (const run of [...course.records, ...course.submissions]) {
    const key = attachmentKey(run.proofImage);
    if (!key) continue;
    const matches = known.get(key) || new Map();
    matches.set(course.id + ":" + run.playerId + ":" + run.timeCs, {
      courseId: course.id, playerId: run.playerId, time: run.time,
      source: run.source, status: run.status,
    });
    known.set(key, matches);
  }
}
const localByAttachment = new Map(Object.entries(assets)
  .filter(([url, asset]) => attachmentKey(url) && asset.path)
  .map(([url, asset]) => [attachmentKey(url), asset.path]));
const queue = [];
const missingMedia = [];
for (const message of [...messages.values()].sort((a, b) => a.datetime.localeCompare(b.datetime))) {
  const messageId = message.id.split("-").at(-1);
  const source = `https://discord.com/channels/629221606064914442/875784780573184010/${messageId}`;
  const date = message.datetime.slice(0, 10);
  // Include both neighboring tours on boundary dates: the wiki provides dates,
  // while a post can precede that day's reset or document an older run.
  const possibleTours = tours.filter(t => date >= t.startDate && date <= t.endDate);
  const tourIds = new Set(possibleTours.map(t => t.id));
  const courseCandidates = courses.filter(c => c.appearances.some(a => tourIds.has(a.tourId))).map(c => c.id);
  const images = new Map();
  for (const url of [...message.links.map(l => l.href), ...message.images.map(i => i.src)]) {
    const key = attachmentKey(url);
    if (!key || !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) continue;
    if (!images.has(key)) images.set(key, url);
  }
  if (!images.size && (message.images.some(i => i.alt === "Image") || /Modify Attachment/.test(message.text))) {
    missingMedia.push({ messageId, submittedAt: message.datetime, source });
  }
  for (const [attachmentId, imageUrl] of images) {
    const review = curated.filter(r => attachmentKey(r.proofImage) === attachmentId);
    const matches = [...(known.get(attachmentId)?.values() || [])];
    queue.push({
      messageId, attachmentId, submittedAt: message.datetime, source, imageUrl,
      localPath: localByAttachment.get(attachmentId) || null,
      tourCandidates: possibleTours.map(t => ({id:t.id, name:t.name})),
      courseCandidates, submissionMatches: matches,
      reviewStatus: review.length ? "manually-reviewed" : "needs-image-review",
      reviewedRuns: review.map(r => ({courseId:r.courseId,time:r.time,status:r.status,notes:r.notes})),
    });
  }
}
const summary = {
  capturedMessages: messages.size,
  imageReferences: queue.length,
  uniqueImages: new Set(queue.map(q => q.attachmentId)).size,
  messagesWithUnloadedMedia: missingMedia.length,
  manuallyReviewedReferences: queue.filter(q => q.reviewStatus === "manually-reviewed").length,
  referencesMatchedToSubmissions: queue.filter(q => q.submissionMatches.length).length,
};
fs.writeFileSync("archive/submission-image-map.json", JSON.stringify({
  summary,
  caution: "Tour/date correlation supplies candidates only. Upload dates are not achievement dates. Submission matches are not proof of WR status. Missing media links need recapture; unreviewed images need visual verification.",
  missingMedia, images: queue,
}, null, 2) + "\n");
console.log(summary);
