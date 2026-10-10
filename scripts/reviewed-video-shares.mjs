import {videoKey} from '../lib/video.mjs';

export function attachReviewedVideoShares(course, row, reviews) {
  const key = videoKey(row.video || row.videoReference);
  if (!key) return;
  for (const review of reviews) {
    if (review.courseId !== course.id || review.playerId !== row.playerId ||
        review.timeCs !== row.timeCs || videoKey(review.video) !== key) continue;
    const events = [...(row.videoShareEvents || []), review.event];
    row.videoShareEvents = [...new Map(events.map(event =>
      [event.source.url, event])).values()];
  }
}
