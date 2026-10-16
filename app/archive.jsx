"use client";
import { useState } from "react";
import Link from "next/link";
function SiteLink(props) {
  return <Link prefetch={false} {...props} />;
}
import { courseStatistics, historyEvents } from "../public/history.mjs";
const date = (s) => (s ? s.slice(0, 10) : "—");
const flag = (c) =>
  c && /^[a-z]{2}$/i.test(c)
    ? String.fromCodePoint(
        ...c
          .toUpperCase()
          .split("")
          .map((x) => 127397 + x.charCodeAt(0)),
      )
    : "—";
function Nation({ country }) {
  return (
    <span className="nation" title={country || "Unknown nation"}>
      {flag(country)}
    </span>
  );
}
function RecordDate({ r }) {
  return date(r.finalDate || r.recordDate || r.achievedAt || r.submittedAt || r.announcedAt);
}
function Duration({ r }) {
  return (
    <span
      title={
        r.durationDays == null
          ? "The preserved evidence does not establish a duration"
          : r.durationBasis === "not-a-world-record" ? "This personal best has no documented WR reign." : `${r.durationDays.toFixed(6)} documented playable days${r.durationPrecision === "day" ? "; date-only evidence uses the 06:00 UTC calculation boundary" : ""}. The clock pauses outside Time Trial tours.`
      }
    >
      {r.durationDays == null
        ? "—"
        : (r.durationDays > 0 && r.durationDays < 1
            ? "<1"
            : Math.floor(r.durationDays))}
    </span>
  );
}
function EvidenceTimes({ r }) {
  const format = value => value ? value.replace("T", " ").replace(/(?:\.\d+)?(?:Z|\+00:00)$/, " UTC") : null;
  const shares = [...(r.videoShareEvents || [])];
  if (r.videoSharedAt && !shares.some(event => event.sharedAt === r.videoSharedAt))
    shares.unshift({sharedAt: r.videoSharedAt, source: r.videoShareSource});
  if (!(r.announcementOnlyProof && r.announcedAt) && !r.submittedAt && !r.earlierSubmissionReceipt && !r.correctedReceiptAt && !r.videoSubmittedAt && !r.videoPublishedAt && !shares.length && !r.forumSourceTimes?.length && !r.sourceReportTimes?.length && !r.resultReportTimes?.length && !r.recoveredSourcePost) return null;
  return <details className="evidence-times">
    <summary>Submission, report and video times</summary>
    {r.announcementOnlyProof && r.announcedAt && <div>WR announcement: <a href={r.source?.url} target="_blank" rel="noopener noreferrer">{format(r.announcedAt)}</a><div>Source posting date used as the submission date. This retrospective post attributes the result to {r.tourDateRange ? `${r.tourDateRange.start} – ${r.tourDateRange.end}` : "the earlier tour"}.</div></div>}
    {r.submittedAt && <div>{r.submissionClockIsReport ? "Original result post: " : "Submitted: "}{format(r.submittedAt)}</div>}
    {r.correctedReceiptAt && <div>Corrected submission receipt: {format(r.correctedReceiptAt)}</div>}
    {r.proofUploadedAt && <div>Evidence file uploaded: {format(r.proofUploadedAt)}</div>}
    {(r.forumSourceTimes || []).map(source => <div key={source.url}>
      Forum report: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.forumPostedAtDisplayed}</a>
      {source.forumTimezoneKnown !== true && " (timezone unknown)"}
      {source.forumLastEditDisplayed && <div>Last forum edit: {source.forumLastEditDisplayed}{source.forumTimezoneKnown !== true && " (timezone unknown)"}</div>}
      <div>Dates follow the surviving posts. Historical edit contents remain unconfirmed.</div>
    </div>)}

    {(r.sourceReportTimes || []).map(source => <div key={source.url}>
      Discord report: <a href={source.url} target="_blank" rel="noopener noreferrer">{format(source.postedAt)}</a>
      <div>Source posting date used as the submission date unless other evidence establishes a different date.</div>
      {source.kind === "archived-cup-menu-image-post" && <div>Cup-menu result retained from prior image review; image contents have not been freshly verified. The poster does not establish the runner's identity.</div>}
    </div>)}
    {(r.resultReportTimes || []).map(report => <div key={report.url + "|" + report.reportedAt}>
      {report.imageReport ? "Runner result image posted: " : report.originalRunnerSubmission ? "Runner result report: " : "Third-party result report: "}
      <a href={report.url} target="_blank" rel="noopener noreferrer">{format(report.reportedAt)}</a>
      {report.imageReport && report.writtenTotalExplicit === false && <div>The caption does not state the exact total; this post is linked to the archived result image.</div>}
      <div>Posting date used as the submission date.</div>
    </div>)}
    {r.recoveredSourcePost && <div>
      Original source posted: <a href={r.recoveredSourcePost.url} target="_blank" rel="noopener noreferrer">{format(r.recoveredSourcePost.postedAt)}</a>
      <div>Post metadata recovered; image contents and result total remain unverified. Posting metadata supplies the default submission date; it does not verify the result.</div>
    </div>}
    {r.earlierSubmissionReceipt?.publishedAt && <div>Earlier submission receipt: <a href={r.earlierSubmissionReceipt.url} target="_blank" rel="noopener noreferrer">{format(r.earlierSubmissionReceipt.publishedAt)}</a>{r.earlierSubmissionReceipt.originalHumanMessageUnavailableInLiveWindow && <div>Original human submission time remains unverified.</div>}</div>}
    {r.videoSubmittedAt && r.videoSubmittedAt !== r.submittedAt && <div>Video submitted: {r.videoSubmissionSource?.url ? <a href={r.videoSubmissionSource.url} target="_blank" rel="noopener noreferrer">{format(r.videoSubmittedAt)}</a> : format(r.videoSubmittedAt)}</div>}
    {r.videoPublishedAt && <div>Video published: {format(r.videoPublishedAt)}</div>}
    {r.videoRediscoveredAt && <div>Video rediscovered: {format(r.videoRediscoveredAt)}</div>}
    {shares.map((event, index) => <div key={event.source?.url || index}>
      Video shared: {event.source?.url ? <a href={event.source.url} target="_blank" rel="noopener noreferrer">{format(event.sharedAt)}</a> : format(event.sharedAt)}
    </div>)}
  </details>;
}
function SplitSourceNote({ r }) {
  const review = r?.lapSourceDiscrepancyReview;
  if (!review) return null;
  const sheet = review.sheetLapOne || review.documentaryLapOne;
  const other = review.originalPlayerForumLapOne || review.priorVideoOverlayLapOne;
  if (!sheet || !other || sheet === other) return null;
  const label = review.originalPlayerForumLapOne ? "Player report" : "Prior video review";
  return <details className="evidence-times">
    <summary>Split sources differ</summary>
    <p className="table-note">First lap: WR-history sheet {sheet}; {label.toLowerCase()} {other}. Displayed splits retain the existing source choice.</p>
    {review.source?.url && <p><a href={review.source.url} target="_blank" rel="noopener noreferrer">Player report</a></p>}
  </details>;
}
function Time({ record: r }) {
  const photoReference = r?.videoReferenceReview?.kind === "archived-original-result-photo-post";
  const preserved = r?.videoAvailability === "unavailable" && r?.videoBackup?.status === "available" ? r.videoBackup.url : null;
  const video = preserved || r?.video || r?.originalVideo || (!photoReference && r?.videoReference);
  const referenceOnly = !photoReference && !r?.video && !r?.originalVideo && Boolean(r?.videoReference);
  const partial = r?.videoScope === "single-lap-clip" || r?.videoScope === "incomplete-first-lap";
  const unavailable = !preserved && (r?.videoAvailability === "unavailable" || (!r?.video && r?.originalVideoAvailable === false));
  const original = video ? (
    <a
      className="time"
      href={video}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${unavailable ? "Original video unavailable" : referenceOnly ? "Original video reference unverified" : partial ? "Partial video reference" : "Watch video proof"} for ${r.time}`}
      title={unavailable ? "Original video unavailable; source link preserved" : referenceOnly ? "Original video reference; footage not verified" : partial ? "Partial recording; does not establish a complete race" : undefined}
    >
      {r.time}
    </a>
  ) : (
    <span
      className="time"
      title={
        r?.videoAudit?.status === "title-time-mismatch"
          ? "Video title conflicts with this time; link awaiting verification"
          : undefined
      }
    >
      {r?.time || "—"}
    </span>
  );
  return original;
}
function BackupIcon() {
  return <svg viewBox="0 0 20 16" width="16" height="14" aria-hidden="true">
    <rect x="1" y="1" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="m8 4 6 4-6 4Z" fill="currentColor" />
  </svg>;
}
function BackupProof({ r }) {
  return r?.videoBackup?.url ? <a
    className="proof-icon"
    href={r.videoBackup.url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Watch backup video for ${r.time}`}
    title={r.videoBackup.kind === "player-recovery"
      ? `Watch recovered video supplied by ${r.videoBackup.channel}`
      : (r.videoBackup.url?.startsWith("https://media.mktwrs.com/") || r.videoBackup.kind?.startsWith("r2-")) ? "Watch preserved video" : `Watch ${r.videoBackup.visibility || "unlisted"} video backup on ${r.videoBackup.channel || "SuperFX64"}`}
  ><BackupIcon /></a> : null;
}
function Player({ id, players }) {
  const p = players.find((p) => p.id === id);
  return p ? (p.hasProfile === false ? p.name : <SiteLink href={`/player/${p.id}`}>{p.name}</SiteLink>) : "—";
}
function Proof({ r }) {
  if (["unavailable", "unverified"].includes(r.proofImageAvailability) && !r.proofImageLocal)
    return r.source?.url ? <a className="proof-icon" href={r.source.url} target="_blank" rel="noopener noreferrer" aria-label={`Source for ${r.time}`} title="Source">↗</a> : null;
  const url = r.proofImageLocal || r.proofImage;
  return url ? (
    <a
      className="proof-icon"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${r.documentaryProofReview ? "View final standings documenting" : "View image proof for"} ${r.time}`}
      title={r.documentaryProofReview ? "Final standings; individual run image unavailable" : "View image proof"}
    >
      <svg viewBox="0 0 20 16" width="16" height="14" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="18"
          height="14"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="14" cy="5" r="2" fill="currentColor" />
        <path
          d="M2 13 7 6l4 5 2-2 5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </a>
  ) : null;
}
function Course({ c }) {
  return <SiteLink href={`/course/${c.id}`}>{c.name}</SiteLink>;
}
function Notice() {
  return (
    <p className="notice">
      History reconstruction in progress.{" "}
      <SiteLink href="/archive">Source coverage</SiteLink>.
    </p>
  );
}
function DateKey() {
  return (
    <p className="table-note">
      Dates use source posting dates as submission dates (UTC), unless the evidence establishes another date. Days count only playable
      Time Trial tours. — unknown. Times link to videos;{" "}
      <svg viewBox="0 0 20 16" width="13" height="11" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="18"
          height="14"
          fill="none"
          stroke="currentColor"
        />
        <path d="M2 13 7 6l4 5 2-2 5 4" fill="none" stroke="currentColor" />
      </svg>{" "}
      opens image proof; <BackupIcon /> opens a preserved video copy.
    </p>
  );
}
function Sidebar({ index }) {
  const [q, setQ] = useState("");
  let letter = "";
  return (
    <aside id="sidebar">
      <SiteLink
        className="brand"
        href="/"
        aria-label="Mario Kart Tour World Records home"
      >
        <img src="/assets/ui/mkt-logo.png" alt="Mario Kart Tour" />
        <span>World Record History</span>
      </SiteLink>
      <nav className="navbox" aria-label="Statistics">
        <strong>Stats</strong>
        <SiteLink href="/">Current WRs</SiteLink>
        <SiteLink href="/rankings">Player Rankings</SiteLink>
        <SiteLink href="/players">Player Profiles</SiteLink>
        <SiteLink href="/tours">Tour Calendar</SiteLink>
      </nav>
      <div className="navbox courses-nav">
        <strong>WR History</strong>
        <input
          type="search"
          aria-label="Find a course"
          placeholder="Find a course…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <nav aria-label="Courses">
          {index
            .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
            .map((c) => {
              const l = c.sortName[0].toUpperCase(),
                separator = l !== letter;
              letter = l;
              return (
                <div
                  key={c.id}
                  className={separator ? "course-group" : undefined}
                >
                  <SiteLink href={`/course/${c.id}`}>{c.name}</SiteLink>
                </div>
              );
            })}
        </nav>
      </div>
      <nav className="navbox" aria-label="Archive">
        <strong>Other</strong>
        <SiteLink href="/archive">About this Archive</SiteLink>
        <a href="/data/courses.json" download>
          Download WR Data (JSON)
        </a>
        <a href="https://discord.com/channels/629221606064914442/896050730216095765">
          MKCentral Time Trials
        </a>
      </nav>
    </aside>
  );
}
function RecordTable({ records, players, events = [], showCourse = false, clean = false }) {
  const entries = events.length
    ? events
    : records.map((r) => ({ type: "record", record: r, id: r.id }));
  return (
    <div className="table-wrap">
      <table className="wr-table">
        <thead>
          <tr>
            <th>Date</th>
            {showCourse && <th>Course</th>}
            <th>Time</th>
            <th>Player</th>
            <th>Nation</th>
            <th title="Playable days">Days</th>
            <th>Lap 1</th>
            <th>Lap 2</th>
            <th className="proof-column" aria-label="Image proof" />
            <th className="proof-column" aria-label="Backup video" />
          </tr>
        </thead>
        <tbody>
          {entries.map((e) =>
            e.type !== "record" ? (
              <tr className="tour-event" key={e.id}>
                <td>{date(e.date)}</td>
                <td colSpan={showCourse ? 9 : 8}>
                  <a href={e.source}>{e.name}</a>{" "}
                  {e.type === "tour-end" ? "ended" : "started"}
                  <span className="event-detail">
                    {" "}
                    ·{" "}
                    {e.type === "tour-end"
                      ? "record clock paused"
                      : "record clock running"}
                  </span>
                </td>
              </tr>
            ) : (
              (() => {
                const r = e.record,
                  p = players.find((p) => p.id === r.playerId);
                return (
                  <tr key={r.id} data-record-id={r.id} className={showCourse && r.isCurrent ? "current-wr" : undefined}>
                    <td><RecordDate r={r} /></td>
                    {showCourse && (
                      <td>
                        <SiteLink href={`/course/${r.courseId}`}>{r.courseName}</SiteLink>
                      </td>
                    )}
                    <td>
                      <Time record={r} />

                    </td>
                    <td>
                      <Player id={r.playerId} players={players} />
                    </td>
                    <td className="center">
                      <Nation country={p?.country} />
                    </td>
                    <td className="center">
                      <Duration r={r} />
                    </td>
                    <td className="split" title={r.lapMatchBasis}>
                      {r.laps?.[0] || "—"}
                    </td>
                    <td
                      className="split"
                      title={
                        r.laps?.[2]
                          ? `Third section: ${r.laps[2]}; all splits preserved in course JSON`
                          : r.lapMatchBasis
                      }
                    >
                      {r.laps?.[1] || "—"}
                    </td>
                    <td className="proof-column">
                      <Proof r={r} />
                    </td>
                    <td className="proof-column">
                      <BackupProof r={r} />
                    </td>
                  </tr>
                );
              })()
            ),
          )}
          {!entries.length && (
            <tr>
              <td colSpan={showCourse ? 10 : 9}>
                No confirmed WR has been recovered yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function StatDuration({ row }) {
  return (
    <span title="Sum of documented playable durations; incomplete dates are excluded">
      {row.durationCount
        ? `${Math.floor(row.days)}${row.missingDays ? "+" : ""}`
        : "—"}
    </span>
  );
}
function CourseStats({ c, players }) {
  const s = courseStatistics(c.records, players),
    duration = [...s.players].sort((a, b) => b.days - a.days),
    counts = [...s.players].sort((a, b) => b.count - a.count);
  return (
    <>
      <h2>Course Stats</h2>
      <div className="course-stats">
        <div className="stat-cell">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>
                  Total
                  <br />
                  Duration
                </th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {duration.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Player id={p.id} players={players} />
                  </td>
                  <td>
                    <StatDuration row={p} />
                  </td>
                  <td>
                    {s.complete && s.days
                      ? ((p.days / s.days) * 100).toFixed(2)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stat-cell">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>
                  Number
                  <br />
                  of WRs
                </th>
              </tr>
            </thead>
            <tbody>
              {counts.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Player id={p.id} players={players} />
                  </td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stat-cell">
          <table>
            <thead>
              <tr>
                <th>Nation</th>
                <th>
                  Total
                  <br />
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {[...s.nations]
                .sort((a, b) => b.days - a.days)
                .slice(0, 5)
                .map((n) => (
                  <tr key={n.id}>
                    <td className="center">
                      <Nation country={n.id} />
                    </td>
                    <td>
                      <StatDuration row={n} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="stat-cell">
          <table>
            <thead>
              <tr>
                <th>Nation</th>
                <th>
                  Number
                  <br />
                  of WRs
                </th>
              </tr>
            </thead>
            <tbody>
              {[...s.nations]
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((n) => (
                  <tr key={n.id}>
                    <td className="center">
                      <Nation country={n.id} />
                    </td>
                    <td>{n.count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="stat-cell totals">
          <table>
            <tbody>
              <tr>
                <td>Total WRs: {c.records.length}</td>
              </tr>
              <tr>
                <td>Unique Players: {s.players.length}</td>
              </tr>
              <tr>
                <td>Unique Nations: {s.nations.filter((n) => n.id).length}</td>
              </tr>
              <tr>
                <td>
                  Tour Appearances:{" "}
                  {new Set(c.appearances.map((a) => a.tourId)).size}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="stat-cell course-art">
          {c.image && <img src={c.image} alt={c.name} />}
        </div>
      </div>
    </>
  );
}
function FastestVideo({ course: c, players }) {
  const r = c.fastestVideo;
  return <section className="fastest-video">
    <h2>{r?.documentedRecordingSelection ? "Fastest documented available recording" : r?.recordingContinuityPending ? "Recording awaiting continuity review" : "Fastest available video"}</h2>
    {r ? <>
      <p><strong>{r.time}</strong> · <Player id={r.playerId} players={players} /> · {r.documentedRecordingSelection ? "Fastest documented result with available footage" : r.recordingContinuityPending ? "Selected recording from prior review" : r.isCurrent ? "Current world record" : "Fastest documented run with available footage"}</p>
      <p className="video-links">
        {r.video && <a href={r.video} target="_blank" rel="noopener noreferrer">Original video</a>}
        {r.videoBackup?.url && <> · <a href={r.videoBackup.url} target="_blank" rel="noopener noreferrer">{r.videoBackup.kind === "player-recovery"
          ? `Recovered video (${r.videoBackup.channel})`
          : r.videoBackup.kind?.startsWith("r2-") ? "Preserved video" : `Backup video (${r.videoBackup.channel || "SuperFX64"} · ${r.videoBackup.visibility || "unlisted"})`}</a></>}
      </p>
      <EvidenceTimes r={r} />
      {r.recordingContinuityPending ? <p className="table-note">The prior review identifies the result, but uninterrupted start-to-finish race coverage still needs verification. This selection is provisional.</p> : !r.isCurrent && <p className="table-note">This footage shows the listed time; its WR status is shown separately.</p>}
    </> : <p className="table-note">No available video has been verified for this course yet.</p>}
  </section>;
}
function HalloweenRecording({ comparison, players, tourLabel = "Halloween Tour (2019)", completed = false }) {
  if (!comparison) return null;
  const { worldRecord: wr, recording: r } = comparison;
  return <section className="fastest-video">
    <h2>{tourLabel} recording comparison</h2>
    {wr && <p>Archived tour WR: <strong>{wr.time}</strong> · <Player id={wr.playerId} players={players} /></p>}
    {(comparison.worldRecordTies || []).filter(tie => tie.id !== wr?.id).map(tie => <div key={tie.id}>
      <p>Archived tour WR tie: <strong>{tie.time}</strong> · <Player id={tie.playerId} players={players} />{tie.proofImageLocal && <> · <a href={tie.proofImageLocal} target="_blank" rel="noopener noreferrer">Image proof</a></>}</p>
      <EvidenceTimes r={tie} />
    </div>)}
    {comparison.dateBoundaryNote && <p className="table-note">{comparison.dateBoundaryNote}</p>}
    {comparison.documentedRecording && comparison.documentedRecording.timeCs !== r?.timeCs && <>
      <p>Fastest documented available recording: <strong>{comparison.documentedRecording.time}</strong> · <Player id={comparison.documentedRecording.playerId} players={players} /> · <a href={comparison.documentedRecording.video} target="_blank" rel="noopener noreferrer">Original video</a>{comparison.documentedRecording.videoBackup?.url && <> · <a href={comparison.documentedRecording.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></>}</p>
      <p className="table-note">The prior review identifies the result. Uninterrupted race coverage has not been freshly certified.</p>
      <EvidenceTimes r={comparison.documentedRecording} />
    </>}
    {r ? <>
      <p>{r.recordingContinuityPending ? "Selected recording from prior review: " : "Fastest full-race recording in the reviewed evidence: "}<strong>{r.time}</strong> · <Player id={r.playerId} players={players} /></p>
      {r.recordingContinuityPending && <p className="table-note">The prior review identifies the result, but uninterrupted start-to-finish race coverage still needs verification. This selection is provisional.</p>}
      <p className="video-links">{r.video && <a href={r.video} target="_blank" rel="noopener noreferrer">Original video</a>}{r.videoBackup?.url && <> · <a href={r.videoBackup.url} target="_blank" rel="noopener noreferrer">Backup video</a></>}</p>
      <EvidenceTimes r={r} />
    </> : <p>No recording has an explicit full-race continuity certification in this archive.</p>}
    {comparison.reportedRecording && <>
      <p>{comparison.reportedRecordingLabel || "Available recording, using the uploader’s stated time: "}<strong>{comparison.reportedRecording.time}</strong> · <Player id={comparison.reportedRecording.playerId} players={players} /> · <a href={comparison.reportedRecording.video} target="_blank" rel="noopener noreferrer">Original video</a>{comparison.reportedRecording.videoBackup?.url && <> · <a href={comparison.reportedRecording.videoBackup.url} target="_blank" rel="noopener noreferrer">Backup video</a></>}</p>
      <p className="table-note">{comparison.reportedRecording.evidenceNote}</p>
      <EvidenceTimes r={comparison.reportedRecording} />
    </>}
    {comparison.referenceRecording && <>
      <p>{comparison.referenceRecordingLabel || "Unavailable recording reference: "}<strong>{comparison.referenceRecording.time}</strong> · <Player id={comparison.referenceRecording.playerId} players={players} /> · <a href={comparison.referenceRecording.video || comparison.referenceRecording.videoReference} target="_blank" rel="noopener noreferrer">Original reference</a></p>
      <p className="table-note">{comparison.referenceRecording.evidenceNote}</p>
      <EvidenceTimes r={comparison.referenceRecording} />
    </>}
    {[comparison.strategyReference, ...(comparison.strategyReferences || [])].filter(Boolean).map(ref => <div key={ref.video}>
      <p>{ref.referenceLabel || "Technique reference"} · <Player id={ref.playerId} players={players} /> · <a href={ref.video} target="_blank" rel="noopener noreferrer">Original source</a> · <a href={ref.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></p>
      <p className="table-note">{ref.evidenceNote || "Technique footage is preserved separately and does not establish a completed record."}</p>
      <EvidenceTimes r={ref} />
    </div>)}
    {[comparison.lapDemonstration, ...(comparison.lapDemonstrations || [])].filter(Boolean).map(lap => <div key={lap.video}>
      <p>Single-lap demonstration: <strong>{lap.time}</strong> · <Player id={lap.playerId} players={players} /> · <a href={lap.video} target="_blank" rel="noopener noreferrer">Original video</a> · <a href={lap.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></p>
      <p className="table-note">The uploader identifies one lap; this clip does not establish a whole-race time.</p>
      <EvidenceTimes r={lap} />
    </div>)}
    {(comparison.sourceImages || []).map(image => <div key={image.url}>
      <p>Discussion screenshot · <Player id={image.playerId} players={players} /> · <a href={image.url} target="_blank" rel="noopener noreferrer">{image.preservedImageLabel || "Preserved original image"}</a> · <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">Original post</a></p>
      <p className="table-note">{image.note}</p>
      <EvidenceTimes r={{submittedAt: image.postedAt}} />
    </div>)}
    {comparison.lateStartRecording && <>
      <p>Available recording starts late: <strong>{comparison.lateStartRecording.time}</strong> · <Player id={comparison.lateStartRecording.playerId} players={players} /> · <a href={comparison.lateStartRecording.video} target="_blank" rel="noopener noreferrer">Original video</a>{comparison.lateStartRecording.videoBackup?.url && <> · <a href={comparison.lateStartRecording.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></>}</p>
      <p className="table-note">The finish and result are visible; the beginning of the race is missing.</p>
      <EvidenceTimes r={comparison.lateStartRecording} />
    </>}
    {!!comparison.pendingRecordings?.length && <details className="sources">
      <summary>{r || comparison.documentedRecording ? "Faster video references awaiting verification" : "Video references awaiting verification"} ({comparison.pendingRecordings.length})</summary>
      <p className="table-note">These references have not established an available complete race. Their reported times do not replace the reviewed recording above.</p>
      {comparison.pendingRecordings.map(candidate => <div key={candidate.id}>
        <p><strong>{candidate.time}</strong> · <Player id={candidate.playerId} players={players} /> · <a href={candidate.video || candidate.videoReference} target="_blank" rel="noopener noreferrer">Original video reference</a></p>
        {candidate.videoResultConflict && <p className="table-note">Unresolved video result: original post says {candidate.videoResultConflict.documentedTime}; automated reads of the linked video suggest {candidate.videoResultConflict.machineReadTime}. The video result still needs visual verification. The documented time is retained.</p>}
        {candidate.videoAvailability === "unavailable" && <p className="table-note">Original video currently unavailable; reference preserved.</p>}
        <EvidenceTimes r={candidate} />
      </div>)}
    </details>}
    <p className="table-note">{completed ? "Practical tour review completed with documented gaps. " : "Tour review in progress. "}Unverified video references remain preserved in supporting results; recording continuity and unavailable originals retain their stated limitations.</p>
  </section>;
}
function HalloweenSupportingResults({ results, players }) {
  if (!results?.length) return null;
  return <details className="sources">
    <summary>Halloween Tour (2019) supporting results ({results.length})</summary>
    <p className="table-note">Forum personal bests and original leaderboard entries preserved outside WR progression. Dates use the surviving posts as submission dates unless another date is established.</p>
    <div className="table-wrap"><table className="wr-table">
      <thead><tr><th>Time + video</th><th>Player</th><th>Documented day</th><th>Sources</th></tr></thead>
      <tbody>{results.map(r => <tr key={r.id}>
        <td><Time record={r} />{r.videoBackup?.url && <div><a href={r.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></div>}{r.nbcSourceConflict && <p className="table-note">Unresolved source disagreement: sheet {r.nbcSourceConflict.sheetTime}; <a href={r.nbcSourceConflict.discordUrl} target="_blank" rel="noopener noreferrer">Discord image</a> previously read as {r.nbcSourceConflict.discordTime}. <a href={r.nbcSourceConflict.forumUrl} target="_blank" rel="noopener noreferrer">Forum text</a> says {r.nbcSourceConflict.forumTime} on NBC; that value is not accepted as a result. These sources have not been reconciled.</p>}{r.videoResultConflict && <p className="table-note">Unresolved video result: original post says {r.videoResultConflict.documentedTime}; automated reads of the linked video suggest {r.videoResultConflict.machineReadTime}. The video result still needs visual verification. The documented time is retained.</p>}</td>
        <td><Player id={r.playerId} players={players} /></td>
        <td>{r.achievedAt ? date(r.achievedAt) : "Unknown; set during Halloween Tour"}{r.dateSourceDiscrepancyReview && <p className="table-note">Sheet day differs from reviewed WR-history day: <a href={r.dateSourceDiscrepancyReview.source.url} target="_blank" rel="noopener noreferrer">{r.dateSourceDiscrepancyReview.reviewedWrHistoryDay}</a>. Exact race time remains unconfirmed.</p>}</td>
        <td>{r.source?.url && <a href={r.source.url} target="_blank" rel="noopener noreferrer">Primary source</a>}
          {(r.additionalSourceLinks || []).map(s => <div key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">Additional source</a></div>)}
          <EvidenceTimes r={r} />
        </td>
      </tr>)}</tbody>
    </table></div>
  </details>;
}
function ParisSupportingResults({ results, players, tourLabel = "Paris Tour (2019)" }) {
  if (!results?.length) return null;
  return <details className="sources">
    <summary>{tourLabel} documented results ({results.length})</summary>
    <p className="table-note">Earlier results, rival times and personal bests are preserved here. They are not certified as world records. Opening day shows the fastest documented result. Dates use source posting dates unless the evidence establishes another date.</p>
    <div className="table-wrap"><table className="wr-table"><thead><tr><th>Time + video</th><th>Player</th><th>Documented day</th><th>Evidence</th></tr></thead>
      <tbody>{results.map(r => <tr key={r.id}><td><Time record={r} />{r.videoBackup?.url && <div><a href={r.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></div>}</td><td><Player id={r.playerId} players={players} /></td><td>{date(r.achievedAt || r.chronologyDate || r.submittedAt || (r.source?.kind === "original-video-publication" ? r.videoPublishedAt : null))}</td><td>{r.source?.url && <a href={r.source.url} target="_blank" rel="noopener noreferrer">Primary source</a>}{(r.proofImageLocal || (r.proofImageAvailability !== "unavailable" && r.proofImage)) && <> · <a href={r.proofImageLocal || r.proofImage} target="_blank" rel="noopener noreferrer">Image proof</a></>}{r.proofImageAvailability === "unavailable" && !r.proofImageLocal && <> · Image unavailable</>}{r.evidenceNote && <div className="table-note">{r.evidenceNote}</div>}<EvidenceTimes r={r} /></td></tr>)}</tbody>
    </table></div>
  </details>;
}
function CoursePage({ data: c, players, tours = [] }) {
  const records = [...c.records, ...(c.hammerRecoveredProgression || [])]
    .sort((a,b) => (a.finalDate || "").localeCompare(b.finalDate || "") || b.timeCs - a.timeCs);
  const best = c.bestRecorded || c.currentHolders[0];
  const movie = c.fastestVideo;
  return <>
    <h1>{c.name}</h1>
    <h2>All-time best</h2>
    <RecordTable records={c.bestHolders?.length ? c.bestHolders : best ? [best] : []} players={players} clean />
    {movie && movie.timeCs !== best?.timeCs && <>
      <h2>Best video</h2>
      <RecordTable records={[movie]} players={players} clean />
    </>}
    <CourseStats c={c} players={players} />
    <h2>History</h2>
    <RecordTable records={records} events={historyEvents({...c, records}, tours, "2026-09-30T06:00:00Z", {includeRecoveredLeaders:true,publishedRecords:true})} players={players} clean />
    <p className="table-note">Dates use documented submissions or publications unless an earlier run date is established. Days count playable time; date-only evidence uses the 06:00 UTC tour reset. Personal bests that never held a WR have 0 WR days.</p>
    <p className="archive-links"><a href={`/data/courses/${c.id}.json`} download>Archive data</a></p>
  </>;
}
function Home({ data, players }) {
  const [q, setQ] = useState("");
  const filtered = data.filter((c) =>
    (
      c.name +
      " " +
      c.currentHolders
        .map((r) => players.find((p) => p.id === r.playerId)?.name)
        .join(" ")
    )
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <h1>Mario Kart Tour World Records</h1>
      <Notice />
      <div className="toolbar">
        <h2>Current WRs</h2>
        <input
          type="search"
          aria-label="Search records"
          placeholder="Course or player…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table className="wr-table">
          <thead>
            <tr>
              <th>Track</th>
              <th>Time+Video</th>
              <th>Player</th>
              <th>Nation</th>
              <th>Date</th>
              <th title="Playable days">Duration</th>
              <th aria-label="Image proof" />
              <th className="proof-column" aria-label="Backup video" />
            </tr>
          </thead>
          <tbody>
            {filtered.flatMap((c) =>
              c.currentHolders.map((r, i) => (
                <tr key={c.id + r.id}>
                  {!i && (
                    <td rowSpan={c.currentHolders.length}>
                      <Course c={c} />
                    </td>
                  )}
                  <td>
                    <Time record={r} />
                  </td>
                  <td>
                    <Player id={r.playerId} players={players} />
                  </td>
                  <td className="center">
                    <Nation
                      country={
                        players.find((p) => p.id === r.playerId)?.country
                      }
                    />
                  </td>
                  <td>
                    <RecordDate r={r} />
                  </td>
                  <td className="center">
                    <Duration r={r} />
                  </td>
                  <td className="proof-column">
                    <Proof r={r} />
                  </td>
                  <td className="proof-column">
                    <BackupProof r={r} />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <DateKey />
    </>
  );
}
function Rankings({ data, players }) {
  const [sort, setSort] = useState("current"),
    [q, setQ] = useState("");
  const ranked = [...data]
    .filter((p) => p.wrCount)
    .sort((a, b) =>
      sort === "current"
        ? b.bestCount - a.bestCount ||
          b.wrCount - a.wrCount ||
          a.name.localeCompare(b.name)
        : sort === "total"
          ? b.wrCount - a.wrCount ||
            b.bestCount - a.bestCount ||
            a.name.localeCompare(b.name)
          : b.days - a.days ||
            b.wrCount - a.wrCount ||
            a.name.localeCompare(b.name),
    );
  let previous = null,
    rank = 0;
  const rows = ranked
    .map((p, i) => {
      const score =
        sort === "current"
          ? p.bestCount
          : sort === "total"
            ? p.wrCount
            : p.days;
      if (score !== previous) rank = i + 1;
      previous = score;
      return { ...p, rank };
    })
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>Player Rankings</h1>
      <p className="ranking-tabs">
        [{" "}
        <button
          className={sort === "current" ? "selected" : ""}
          onClick={() => setSort("current")}
        >
          Current WRs
        </button>{" "}
        |{" "}
        <button
          className={sort === "total" ? "selected" : ""}
          onClick={() => setSort("total")}
        >
          Total WRs
        </button>{" "}
        |{" "}
        <button
          className={sort === "duration" ? "selected" : ""}
          onClick={() => setSort("duration")}
        >
          Total Duration
        </button>{" "}
        ]
      </p>
      <div className="toolbar">
        <span>Confirmed world records only</span>
        <input
          type="search"
          aria-label="Search rankings"
          placeholder="Player…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Nation</th>
              <th>Current WRs</th>
              <th>Total WRs</th>
              <th>Total Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.rank}</td>
                <td>
                  <Player id={p.id} players={players} />
                </td>
                <td className="center">
                  <Nation country={p.country} />
                </td>
                <td>{p.bestCount}</td>
                <td>{p.wrCount}</td>
                <td>
                  <StatDuration row={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Tied WRs count for each holder. Duration rankings use recovered
        playable-day totals; + marks incomplete totals. Missing historical
        records can change these rankings.
      </p>
    </>
  );
}
function PlayersPage({ data }) {
  const [q, setQ] = useState("");
  return (
    <>
      <h1>Player Profiles</h1>
      <div className="toolbar">
        <SiteLink href="/rankings">View Player Rankings</SiteLink>
        <input
          type="search"
          aria-label="Search players"
          placeholder="Player…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Nation</th>
              <th>Current WRs</th>
              <th>Total WRs</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    <SiteLink href={`/player/${p.id}`}>{p.name}</SiteLink>
                  </td>
                  <td className="center">
                    <Nation country={p.country} />
                  </td>
                  <td>{p.bestCount}</td>
                  <td>{p.wrCount}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Avatar({ player: p }) {
  const [failed, setFailed] = useState(false);
  return p.avatar && !failed ? (
    <img className="avatar" src={p.avatar} alt={`${p.name} Discord avatar`} width="80" height="80" onError={() => setFailed(true)} />
  ) : <span className="avatar avatar-placeholder" aria-label={`${p.name}: portrait unavailable`}>{Array.from(p.name)[0]}</span>;
}
function PlayerPage({ data: p, players }) {
  return (
    <>
      <div className="profile-head">
        <Avatar key={p.id} player={p} />
        <div>
          <h1>{p.name}</h1>
          <Nation country={p.country} />
          {Object.entries(p.socials || {})
            .filter(([, url]) => url)
            .map(([name, url]) => (
              <a className="social" key={name} href={url}>
                {name}
              </a>
            ))}
        </div>
      </div>
      <h2>Player Stats</h2>
      <table className="profile-stats">
        <thead>
          <tr>
            <th>Current WRs</th>
            <th>Total WRs</th>
            <th>Total Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{p.bestCount}</td>
            <td>{p.records.length}</td>
            <td>
              <StatDuration row={p} />
            </td>
          </tr>
        </tbody>
      </table>
      <h2>WR History</h2>
      <p className="table-note">Current world records are shown in <strong>bold</strong>.</p>
      <RecordTable records={p.records} players={players} showCourse />
      <DateKey />
      <p>
        <SiteLink href="/rankings">Player Rankings</SiteLink> ·{" "}
        <SiteLink href="/players">All Players</SiteLink>
      </p>
    </>
  );
}
function ToursPage({ data }) {
  return (
    <>
      <h1>Tour Calendar</h1>
      <p className="table-note">
        Time Trial bonus challenges. The WR clock pauses at the end date shown.
      </p>
      <div className="table-wrap">
        <table className="tour-list">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Time Trial courses</th>
              <th>Start</th>
              <th>End (exclusive)</th>
              <th>Archive review</th>
            </tr>
          </thead>
          <tbody>
            {[...data]
              .sort((a, b) => b.startDate.localeCompare(a.startDate))
              .map((t) => (
                <tr key={t.id}>
                  <td>
                    <a href={t.source}>{t.name}</a>
                  </td>
                  <td>
                    {t.courses.map((c, i) => (
                      <span key={c.id}>
                        {i ? " · " : ""}
                        <SiteLink href={`/course/${c.id}`}>{c.name}</SiteLink>
                      </span>
                    ))}
                  </td>
                  <td>{t.startDate}</td>
                  <td>{t.endDate}</td>
                  <td>{t.review ? <a href={t.review.evidenceUrl}>{t.review.label}</a> : "Not completed"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function About({ manifest: m, tours }) {
  return (
    <>
      <h1>About the Archive</h1>
      <div className="prose">
        <p>
          This archive preserves Mario Kart Tour’s Time Trial records and the
          submissions behind them. Records retain their source references, video
          proof and available lap splits.
        </p>
        <Notice />
        <h2>Current coverage</h2>
        <p>
          <strong>{m.courseCount} course variants</strong>,{" "}
          <strong>{tours.length} tour windows</strong>,{" "}
          <strong>{m.announcementCount} WR observations</strong> and{" "}
          <strong>
            {m.submissionCount.toLocaleString()} spreadsheet submissions
          </strong>{" "}
          are preserved. {m.submissionMessagesCaptured} Discord submission
          messages have been captured and {m.enrichedRecords} announcements
          matched with additional submission data.
        </p>
        <p>
          Research is incomplete. The history channel was read back to its
          beginning, including migrated records from 2019. The dedicated
          submission channel was captured back to its August 13, 2021 beginning.
          Screenshot totals, lap splits and missing submission
          dates still need reconciliation. WR tables and rankings include only
          records announced in wr-history or supported by reviewed community WR
          evidence. Ordinary submissions and inferred contenders remain in
          the downloadable evidence, outside WR statistics.
        </p>
        <p>
          Contemporary WR histories can document a record even when its original
          image or video has disappeared. Those entries retain the historical
          source, date and available splits. The course’s record sources identify
          this evidence limitation; unavailable media is not presented as verified
          image or video proof.
        </p>
        <h2>Dates and playable-day durations</h2>
        <p>
          Announcement dates, submission dates and achievement dates are
          separate. Migrated or delayed announcements cannot establish when a
          record was set. Blank spreadsheet dates stay unknown, and source row
          order does not establish chronology.
        </p>
        <p>
          A record set February 24 with course availability ending February 27
          earns 3 playable days. If the course returns October 10 and the record
          falls October 12, it earns another 2 days: 5 in total. Overlapping
          windows count once. A tie keeps the original record’s reign intact.
        </p>
        <p>
          The displayed date uses the original tt-submission post when available.
          This is the archive’s dating convention; a run may have been played
          before it was posted. Older records without a recovered submission use
          their documented source date or proof upload date, identified in the
          date tooltip. Missing dates stay blank. Duration totals use these
          calendar dates and can change as missing records are recovered. The
          calendar follows Time Trial bonus challenges, not ordinary races.
        </p>
        <h2>Proof and splits</h2>
        <p>
          Only video proof is linked from the displayed time. A small image icon
          at the right of each record opens its screenshot proof. When a two-lap run
          has a total and one known lap, the other lap is calculated by subtraction.
          Missing splits remain blank. A warning beside source splits
          means they do not sum to the total; inconsistent splits are not
          promoted to a WR row. Video links whose titles name a different time
          are withheld pending verification; their original references and audit
          results remain in the JSON.
        </p>
        <h2>Download the static archive</h2>
        <p>
          Next.js serves versioned JSON without a database. Per-course files
          include all preserved submissions and sources. The original workbook
          and raw message captures are kept separately from the public
          presentation.
        </p>
        <p>
          <a className="download" href="/data/courses.json" download>
            Courses & records
          </a>
          <a className="download" href="/data/players.json" download>
            Players
          </a>
          <a className="download" href="/data/tours.json" download>
            Tours
          </a>
          <a href="/data/manifest.json" download>
            Coverage manifest
          </a>
        </p>
        <h2>Sources & credits</h2>
        <ul>
          {m.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url}>{s.name}</a>
            </li>
          ))}
          <li>
            <a href="https://docs.google.com/spreadsheets/d/1fTkcCluvL4frXvvFw4qBvkHBpj7mVtw7sCgDs6TGGno/edit">
              Mario Kart Tour Course Leaderboard
            </a>
          </li>
        </ul>
        <p>
          Layout inspired by <a href="https://mkwrs.com/mkwii/">MKWRS</a>.
          Course artwork © Nintendo. Tour references from Super Mario Wiki.
        </p>
        <p className="meta">Data built {date(m.updatedAt)}.</p>
      </div>
    </>
  );
}

export default function Archive(props) {
  const View = {
    home: Home,
    course: CoursePage,
    players: PlayersPage,
    player: PlayerPage,
    rankings: Rankings,
    tours: ToursPage,
    archive: About,
  }[props.view];
  return (
    <>
      <a className="skip" href="#main">
        Skip to records
      </a>
      <Sidebar index={props.index} />
      <header className="topbar">
        [ <SiteLink href="/">MKTour</SiteLink> | <SiteLink href="/rankings">Player Rankings</SiteLink> |{" "}
        <SiteLink href="/tours">Tours</SiteLink> | <SiteLink href="/archive">Archive</SiteLink> ]
      </header>
      <main id="main">
        <View {...props} />
        <footer>
          Mario Kart Tour World Records · Independent community archive
          <br />
          Game logo, item icons and course artwork © Nintendo ·{" "}
          <a href="https://www.mariowiki.com/Time_Trial_(Mario_Kart_Tour)">
            Super Mario Wiki
          </a>{" "}
          · Layout reference: <a href="https://mkwrs.com/mkworld/">MKWRS</a>
        </footer>
      </main>
    </>
  );
}
