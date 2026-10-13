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
  return (
    <span
      title={
        r.dateBasis === "first-screenshot-publication"
          ? "Earliest known screenshot publication; race completion date unconfirmed"
          : r.dateBasis === "submission-date"
          ? "Date posted in the original submission"
          : r.dateBasis === "proof-upload-date"
            ? "Proof upload date within the recorded tour; achievement date unconfirmed"
            : r.dateBasis === "source-date"
              ? "Date documented in the linked historical source"
            : r.tourDateRange
              ? `Set during ${r.tourDateRange.start} – ${r.tourDateRange.end}; exact day unknown`
              : undefined
      }
    >
      {r.dateBasis === "first-screenshot-publication"
        ? `Screenshot published: ${date(r.recordDate)}; achievement date unknown`
        : r.dateBasis === "proof-upload-date"
          ? `Proof uploaded: ${date(r.recordDate)}; achievement date unknown`
          : r.dateUnresolved && !r.achievedAt
            ? "Achievement date unknown"
            : date(r.recordDate || r.achievedAt)}

    </span>
  );
}
function Duration({ r }) {
  return (
    <span
      title={
        r.durationDays == null
          ? "The preserved evidence does not establish a duration"
          : "Playable days from the recorded dates. The clock pauses outside the course’s Time Trial tours."
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
  const format = value => value ? value.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC") : null;
  const shares = [...(r.videoShareEvents || [])];
  if (r.videoSharedAt && !shares.some(event => event.sharedAt === r.videoSharedAt))
    shares.unshift({sharedAt: r.videoSharedAt, source: r.videoShareSource});
  if (!r.submittedAt && !r.videoPublishedAt && !shares.length && !r.forumSourceTimes?.length && !r.sourceReportTimes?.length && !r.resultReportTimes?.length && !r.recoveredSourcePost) return null;
  return <details className="evidence-times">
    <summary>Submission, report and video times</summary>
    {r.submittedAt && !shares.some(event => event.sharedAt === r.submittedAt) && <div>{r.submissionClockIsReport ? "Original result post: " : "Submitted: "}{format(r.submittedAt)}</div>}
    {(r.forumSourceTimes || []).map(source => <div key={source.url}>
      Forum report: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.forumPostedAtDisplayed}</a>
      {source.forumTimezoneKnown !== true && " (timezone unknown)"}
      {source.forumLastEditDisplayed && <div>Last forum edit: {source.forumLastEditDisplayed}{source.forumTimezoneKnown !== true && " (timezone unknown)"}</div>}
      <div>Displayed source clocks; exact race time and historical edit contents unconfirmed.</div>
    </div>)}

    {(r.sourceReportTimes || []).map(source => <div key={source.url}>
      Discord report: <a href={source.url} target="_blank" rel="noopener noreferrer">{format(source.postedAt)}</a>
      <div>Source-message posting time; race completion time is separate.</div>
      {source.kind === "archived-cup-menu-image-post" && <div>Cup-menu result retained from prior image review; image contents have not been freshly verified. The poster does not establish the runner's identity.</div>}
    </div>)}
    {(r.resultReportTimes || []).map(report => <div key={report.url + "|" + report.reportedAt}>
      {report.imageReport ? "Runner result image posted: " : report.originalRunnerSubmission ? "Runner result report: " : "Third-party result report: "}
      <a href={report.url} target="_blank" rel="noopener noreferrer">{format(report.reportedAt)}</a>
      {report.imageReport && report.writtenTotalExplicit === false && <div>The caption does not state the exact total; this post is linked to the archived result image.</div>}
      <div>Report posting time; exact race completion time is unconfirmed.</div>
    </div>)}
    {r.recoveredSourcePost && <div>
      Original source posted: <a href={r.recoveredSourcePost.url} target="_blank" rel="noopener noreferrer">{format(r.recoveredSourcePost.postedAt)}</a>
      <div>Post metadata recovered; image contents and result total remain unverified. This is not a confirmed race or submission time.</div>
    </div>}
    {r.videoPublishedAt && <div>Video published: {format(r.videoPublishedAt)}</div>}
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
  const video = r?.video || r?.originalVideo || (!photoReference && r?.videoReference);
  const referenceOnly = !photoReference && !r?.video && !r?.originalVideo && Boolean(r?.videoReference);
  const partial = r?.videoScope === "single-lap-clip" || r?.videoScope === "incomplete-first-lap";
  const unavailable = r?.videoAvailability === "unavailable" || (!r?.video && r?.originalVideoAvailable === false);
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
  return <>{original}{video && unavailable && <span className="table-note"> · Original video unavailable</span>}{referenceOnly && <span className="table-note"> · Video reference unverified</span>}{video && partial && <span className="table-note"> · Partial recording; complete race unverified</span>}<EvidenceTimes r={r} /><SplitSourceNote r={r} /></>;
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
      : r.videoBackup.kind === "r2-preserved-original" ? "Watch preserved original video" : `Watch ${r.videoBackup.visibility || "unlisted"} video backup on ${r.videoBackup.channel || "SuperFX64"}`}
  ><BackupIcon /></a> : null;
}
function Player({ id, players }) {
  const p = players.find((p) => p.id === id);
  return p ? (p.hasProfile === false ? p.name : <SiteLink href={`/player/${p.id}`}>{p.name}</SiteLink>) : "—";
}
function Proof({ r }) {
  if (r.proofImageAvailability === "unavailable" && !r.proofImageLocal)
    return <span title="Original image unavailable">Image unavailable</span>;
  const url = r.proofImageLocal || r.proofImage;
  return url ? (
    <a
      className="proof-icon"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View image proof for ${r.time}`}
      title="View image proof"
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
      History reconstruction in progress. Only confirmed WRs are listed.{" "}
      <SiteLink href="/archive">Source coverage</SiteLink>.
    </p>
  );
}
function DateKey() {
  return (
    <p className="table-note">
      Dates use original submissions (UTC) where available. Days count only playable
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
function RecordTable({ records, players, events = [], showCourse = false }) {
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
                  <tr key={r.id} className={showCourse && r.isCurrent ? "current-wr" : undefined}>
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
      {!s.complete && (
        <p className="table-note">
          Duration totals are partial where record dates are missing (+).
          Percentages remain blank until the chronology is established.
        </p>
      )}
    </>
  );
}
function FastestVideo({ course: c, players }) {
  const r = c.fastestVideo;
  return <section className="fastest-video">
    <h2>{r?.recordingContinuityPending ? "Recording awaiting continuity review" : "Fastest available video"}</h2>
    {r ? <>
      <p><strong>{r.time}</strong> · <Player id={r.playerId} players={players} /> · {r.recordingContinuityPending ? "Selected recording from prior review" : r.isCurrent ? "Current world record" : "Fastest documented run with available footage"}</p>
      <p className="video-links">
        {r.video && <a href={r.video} target="_blank" rel="noopener noreferrer">Original video</a>}
        {r.videoBackup?.url && <> · <a href={r.videoBackup.url} target="_blank" rel="noopener noreferrer">{r.videoBackup.kind === "player-recovery"
          ? `Recovered video (${r.videoBackup.channel})`
          : r.videoBackup.kind === "r2-preserved-original" ? "Preserved original video" : `Backup video (${r.videoBackup.channel || "SuperFX64"} · ${r.videoBackup.visibility || "unlisted"})`}</a></>}
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
    {comparison.lateStartRecording && <>
      <p>Available recording starts late: <strong>{comparison.lateStartRecording.time}</strong> · <Player id={comparison.lateStartRecording.playerId} players={players} /> · <a href={comparison.lateStartRecording.video} target="_blank" rel="noopener noreferrer">Original video</a>{comparison.lateStartRecording.videoBackup?.url && <> · <a href={comparison.lateStartRecording.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a></>}</p>
      <p className="table-note">The finish and result are visible; the beginning of the race is missing.</p>
      <EvidenceTimes r={comparison.lateStartRecording} />
    </>}
    {!!comparison.pendingRecordings?.length && <details className="sources">
      <summary>Faster video references awaiting verification ({comparison.pendingRecordings.length})</summary>
      <p className="table-note">These references have not established an available complete race. Their reported times do not replace the reviewed recording above.</p>
      {comparison.pendingRecordings.map(candidate => <div key={candidate.id}>
        <p><strong>{candidate.time}</strong> · <Player id={candidate.playerId} players={players} /> · <a href={candidate.video || candidate.videoReference} target="_blank" rel="noopener noreferrer">Original video reference</a></p>
        {candidate.videoResultConflict && <p className="table-note">Unresolved video result: original post says {candidate.videoResultConflict.documentedTime}; automated reads of the linked video suggest {candidate.videoResultConflict.machineReadTime}. The video result still needs visual verification. The documented time is retained.</p>}
        {candidate.videoAvailability === "unavailable" && <p className="table-note">Original video currently unavailable; reference preserved.</p>}
        <EvidenceTimes r={candidate} />
      </div>)}
    </details>}
    <p className="table-note">{completed ? "Practical tour review completed with documented gaps. " : "Tour review in progress. "}Faster unverified references remain preserved; recording continuity and unavailable originals retain their stated limitations.</p>
  </section>;
}
function HalloweenSupportingResults({ results, players }) {
  if (!results?.length) return null;
  return <details className="sources">
    <summary>Halloween Tour (2019) supporting results ({results.length})</summary>
    <p className="table-note">Forum personal bests and original leaderboard entries preserved outside WR progression. Dates are documented source days; exact race times and missing videos remain unknown.</p>
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
    <p className="table-note">Earlier results, rival times and personal bests are preserved here. They are not certified as world records. Opening day shows the fastest documented result; exact finish times remain unknown where only a report date survives.</p>
    <div className="table-wrap"><table className="wr-table"><thead><tr><th>Time + video</th><th>Player</th><th>Documented day</th><th>Evidence</th></tr></thead>
      <tbody>{results.map(r => <tr key={r.id}><td><Time record={r} /></td><td><Player id={r.playerId} players={players} /></td><td>{date(r.achievedAt || r.chronologyDate || r.submittedAt)}</td><td>{r.source?.url && <a href={r.source.url} target="_blank" rel="noopener noreferrer">Primary source</a>}{(r.proofImageLocal || (r.proofImageAvailability !== "unavailable" && r.proofImage)) && <> · <a href={r.proofImageLocal || r.proofImage} target="_blank" rel="noopener noreferrer">Image proof</a></>}{r.proofImageAvailability === "unavailable" && !r.proofImageLocal && <> · Image unavailable</>}<EvidenceTimes r={r} /></td></tr>)}</tbody>
    </table></div>
  </details>;
}
function CoursePage({ data: c, players, tours, manifest }) {
  const events = historyEvents(c, tours, manifest.updatedAt);
  const fragments = c.records.flatMap(r => (r.videoFragments || []).map(fragment => ({ record: r, ...fragment })));
  return (
    <>
      <h1>{c.name}</h1>
      <h2>Current WR:</h2>
      <RecordTable records={c.currentHolders} players={players} />
      <CourseStats c={c} players={players} />
      <FastestVideo course={c} players={players} />
      <HalloweenRecording comparison={c.halloween2019Recording} players={players} completed={c.halloween2019Recording?.practicalReviewComplete === true} />
      <HalloweenSupportingResults results={c.halloweenSupportingResults} players={players} />
      {!!c.preservedHalloweenRecordings?.length && <details className="sources">
        <summary>Additional preserved Halloween recordings ({c.preservedHalloweenRecordings.length})</summary>
        <p className="table-note">Supporting recordings preserved separately from WR progression. Original posting clocks and footage limitations remain in the linked evidence.</p>
        {c.preservedHalloweenRecordings.map(r => <p key={r.id}><strong>{r.time}</strong> · <a href={r.video || r.videoReference} target="_blank" rel="noopener noreferrer">Original source</a> · <a href={r.videoBackup.url} target="_blank" rel="noopener noreferrer">Preserved video</a><EvidenceTimes r={r} /></p>)}
      </details>}
      <HalloweenRecording comparison={c.paris2019Recording} players={players} tourLabel="Paris Tour (2019)" completed={c.paris2019Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.parisSupportingResults} players={players} />
      <HalloweenRecording comparison={c.winter2019Recording} players={players} tourLabel="Winter Tour (2019)" completed={c.winter2019Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.winterSupportingResults} players={players} tourLabel="Winter Tour (2019)" />
      <HalloweenRecording comparison={c.london2019Recording} players={players} tourLabel="London Tour (2019)" completed={c.london2019Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.londonSupportingResults} players={players} tourLabel="London Tour (2019)" />
      <HalloweenRecording comparison={c.holiday2019Recording} players={players} tourLabel="Holiday Tour (2019)" completed={c.holiday2019Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.holidaySupportingResults} players={players} tourLabel="Holiday Tour (2019)" />
      <HalloweenRecording comparison={c.newyear2020Recording} players={players} tourLabel="New Year’s Tour (2020)" completed={c.newyear2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.newyearSupportingResults} players={players} tourLabel="New Year’s Tour (2020)" />
      <HalloweenRecording comparison={c.ice2020Recording} players={players} tourLabel="Ice Tour (2020)" completed={c.ice2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.iceSupportingResults} players={players} tourLabel="Ice Tour (2020)" />
      <HalloweenRecording comparison={c.valentines2020Recording} players={players} tourLabel="Valentine’s Tour (2020)" completed={c.valentines2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.valentinesSupportingResults} players={players} tourLabel="Valentine’s Tour (2020)" />
      <HalloweenRecording comparison={c.vancouver2020Recording} players={players} tourLabel="Vancouver Tour (2020)" completed={c.vancouver2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.vancouverSupportingResults} players={players} tourLabel="Vancouver Tour (2020)" />
      {!!c.vancouverPartialClips?.length && c.id === "snes-choco-island-2r" && <section className="fastest-video">
        <h2>Vancouver Tour (2020) partial recordings</h2>
        <p>These clips show lap-one footage and the beginning of lap two. No completed race total is shown.</p>
        {c.vancouverPartialClips.map(clip => <p key={clip.originalUrl}>{clip.player}{clip.firstLap ? ` · First lap ${clip.firstLap}` : ""} · <a href={clip.originalUrl} target="_blank" rel="noopener noreferrer">Original clip</a> · <a href={clip.preservedUrl} target="_blank" rel="noopener noreferrer">Preserved clip</a><br />Original publication: {clip.originalPublishedAt} · Achievement time unknown</p>)}
      </section>}
      <HalloweenRecording comparison={c.mariobros2020Recording} players={players} tourLabel="Mario Bros. Tour (2020)" completed={c.mariobros2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.mariobrosSupportingResults} players={players} tourLabel="Mario Bros. Tour (2020)" />
      <HalloweenRecording comparison={c.babyrosalina2020Recording} players={players} tourLabel="Baby Rosalina Tour (2020)" completed={c.babyrosalina2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.babyrosalinaSupportingResults} players={players} tourLabel="Baby Rosalina Tour (2020)" />
      <HalloweenRecording comparison={c.hammer2020Recording} players={players} tourLabel="Hammer Bro Tour (2020)" completed={c.hammer2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.hammerSupportingResults} players={players} tourLabel="Hammer Bro Tour (2020)" />
      <HalloweenRecording comparison={c.yoshi2020Recording} players={players} tourLabel="Yoshi Tour (2020)" completed={c.yoshi2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.yoshiSupportingResults} players={players} tourLabel="Yoshi Tour (2020)" />
      <HalloweenRecording comparison={c.trick2020Recording} players={players} tourLabel="Trick Tour (2020)" completed={c.trick2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.trickSupportingResults} players={players} tourLabel="Trick Tour (2020)" />
      <HalloweenRecording comparison={c.flower2020Recording} players={players} tourLabel="Flower Tour (2020)" completed={c.flower2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.flowerSupportingResults} players={players} tourLabel="Flower Tour (2020)" />
      <HalloweenRecording comparison={c.jungle2020Recording} players={players} tourLabel="Jungle Tour (2020)" completed={c.jungle2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.jungleSupportingResults} players={players} tourLabel="Jungle Tour (2020)" />
      <HalloweenRecording comparison={c.cooking2020Recording} players={players} tourLabel="Cooking Tour (2020)" completed={c.cooking2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.cookingSupportingResults} players={players} tourLabel="Cooking Tour (2020)" />
      <HalloweenRecording comparison={c.losangeles2020Recording} players={players} tourLabel="Los Angeles Tour (2020)" completed={c.losangeles2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.losangelesSupportingResults} players={players} tourLabel="Los Angeles Tour (2020)" />
      <HalloweenRecording comparison={c.anniversary2020Recording} players={players} tourLabel="1st Anniversary Tour (2020)" completed={c.anniversary2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.anniversarySupportingResults} players={players} tourLabel="1st Anniversary Tour (2020)" />
      <HalloweenRecording comparison={c.halloween2020Recording} players={players} tourLabel="Halloween Tour (2020)" completed={c.halloween2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.halloween2020SupportingResults} players={players} tourLabel="Halloween Tour (2020)" />
      <HalloweenRecording comparison={c.sunset2020Recording} players={players} tourLabel="Sunset Tour (2020)" completed={c.sunset2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.sunsetSupportingResults} players={players} tourLabel="Sunset Tour (2020)" />
      <HalloweenRecording comparison={c.marioluigi2020Recording} players={players} tourLabel="Mario vs. Luigi Tour (2020)" completed={c.marioluigi2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.marioluigiSupportingResults} players={players} tourLabel="Mario vs. Luigi Tour (2020)" />
      <HalloweenRecording comparison={c.winter2020Recording} players={players} tourLabel="Winter Tour (2020)" completed={c.winter2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.winter2020SupportingResults} players={players} tourLabel="Winter Tour (2020)" />
      <HalloweenRecording comparison={c.rosalina2020Recording} players={players} tourLabel="Rosalina Tour (2020)" completed={c.rosalina2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.rosalina2020SupportingResults} players={players} tourLabel="Rosalina Tour (2020)" />
      <HalloweenRecording comparison={c.newyear2021Recording} players={players} tourLabel="New Year’s Tour (2021)" completed={c.newyear2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.newyear2021SupportingResults} players={players} tourLabel="New Year’s Tour (2021)" />
      <HalloweenRecording comparison={c.berlin2021Recording} players={players} tourLabel="Berlin Tour (2021)" completed={c.berlin2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.berlin2021SupportingResults} players={players} tourLabel="Berlin Tour (2021)" completed={c.berlin2021Recording?.practicalReviewComplete === true} />
      <HalloweenRecording comparison={c.cat2021Recording} players={players} tourLabel="Cat Tour (2021)" completed={c.cat2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.cat2021SupportingResults} players={players} tourLabel="Cat Tour (2021)" />
      <HalloweenRecording comparison={c.peachdaisy2021Recording} players={players} tourLabel="Peach vs. Daisy Tour" completed={c.peachdaisy2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.peachdaisy2021SupportingResults} players={players} tourLabel="Peach vs. Daisy Tour" />
      <HalloweenRecording comparison={c.snow2021Recording} players={players} tourLabel="Snow Tour" completed={c.snow2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.snow2021SupportingResults} players={players} tourLabel="Snow Tour" />
      <HalloweenRecording comparison={c.mario2021Recording} players={players} tourLabel="Mario Tour (2021)" completed={c.mario2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.mario2021SupportingResults} players={players} tourLabel="Mario Tour (2021)" />
      <HalloweenRecording comparison={c.yoshi2021Recording} players={players} tourLabel="Yoshi Tour (2021)" completed={c.yoshi2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.yoshi2021SupportingResults} players={players} tourLabel="Yoshi Tour (2021)" />
      <HalloweenRecording comparison={c.ninja2021Recording} players={players} tourLabel="Ninja Tour (2021)" completed={c.ninja2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.ninja2021SupportingResults} players={players} tourLabel="Ninja Tour (2021)" />
      <HalloweenRecording comparison={c.sydney2021Recording} players={players} tourLabel="Sydney Tour (April 2021)" completed={c.sydney2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.sydney2021SupportingResults} players={players} tourLabel="Sydney Tour (April 2021)" />
      <HalloweenRecording comparison={c.bowserdk2021Recording} players={players} tourLabel="Bowser vs. DK Tour (2021)" completed={c.bowserdk2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.bowserdk2021SupportingResults} players={players} tourLabel="Bowser vs. DK Tour (2021)" />
      <HalloweenRecording comparison={c.trick2021Recording} players={players} tourLabel="Trick Tour (2021)" completed={c.trick2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.trick2021SupportingResults} players={players} tourLabel="Trick Tour (2021)" />
      <HalloweenRecording comparison={c.wedding2021Recording} players={players} tourLabel="Wedding Tour (2021)" completed={c.wedding2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.wedding2021SupportingResults} players={players} tourLabel="Wedding Tour (2021)" />
      <HalloweenRecording comparison={c.paris2021Recording} players={players} tourLabel="Paris Tour (2021)" completed={c.paris2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.paris2021SupportingResults} players={players} tourLabel="Paris Tour (2021)" />
      <HalloweenRecording comparison={c.summer2021Recording} players={players} tourLabel="Summer Tour (2021)" completed={c.summer2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.summer2021SupportingResults} players={players} tourLabel="Summer Tour (2021)" />
      <HalloweenRecording comparison={c.la2021Recording} players={players} tourLabel="Los Angeles Tour (2021)" completed={c.la2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.la2021SupportingResults} players={players} tourLabel="Los Angeles Tour (2021)" />
      <HalloweenRecording comparison={c.mariopeach2021Recording} players={players} tourLabel="Mario vs. Peach Tour (2021)" completed={c.mariopeach2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.mariopeach2021SupportingResults} players={players} tourLabel="Mario vs. Peach Tour (2021)" />
      <HalloweenRecording comparison={c.frost2021Recording} players={players} tourLabel="Frost Tour (2021)" completed={c.frost2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.frost2021SupportingResults} players={players} tourLabel="Frost Tour (2021)" />
      <HalloweenRecording comparison={c.kamek2021Recording} players={players} tourLabel="Kamek Tour (2021)" completed={c.kamek2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.kamek2021SupportingResults} players={players} tourLabel="Kamek Tour (2021)" />
      <HalloweenRecording comparison={c.sydneysep2021Recording} players={players} tourLabel="Sydney Tour (September 2021)" completed={c.sydneysep2021Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.sydneysep2021SupportingResults} players={players} tourLabel="Sydney Tour (September 2021)" />
      <HalloweenRecording comparison={c.anniversary2021Recording} players={players} tourLabel="2nd Anniversary Tour (2021)" />
      <ParisSupportingResults results={c.anniversary2021SupportingResults} players={players} tourLabel="2nd Anniversary Tour (2021)" />
      <HalloweenRecording comparison={c.autumn2021Recording} players={players} tourLabel="Autumn Tour (2021)" />
      <ParisSupportingResults results={c.autumn2021SupportingResults} players={players} tourLabel="Autumn Tour (2021)" />
      <HalloweenRecording comparison={c.halloween2021Recording} players={players} tourLabel="Halloween Tour (2021)" />
      <ParisSupportingResults results={c.halloween2021SupportingResults} players={players} tourLabel="Halloween Tour (2021)" />
      <HalloweenRecording comparison={c.toadette2021Recording} players={players} tourLabel="Toad vs. Toadette Tour (2021)" />
      <ParisSupportingResults results={c.toadette2021SupportingResults} players={players} tourLabel="Toad vs. Toadette Tour (2021)" />
      <HalloweenRecording comparison={c.space2021Recording} players={players} tourLabel="Space Tour (2021)" />
      <ParisSupportingResults results={c.space2021SupportingResults} players={players} tourLabel="Space Tour (2021)" />
      <HalloweenRecording comparison={c.holiday2021Recording} players={players} tourLabel="Holiday Tour (2021)" />
      <ParisSupportingResults results={c.holiday2021SupportingResults} players={players} tourLabel="Holiday Tour (2021)" />
      <HalloweenRecording comparison={c.penguin2021Recording} players={players} tourLabel="Penguin Tour" />
      <ParisSupportingResults results={c.penguin2021SupportingResults} players={players} tourLabel="Penguin Tour" />
      <HalloweenRecording comparison={c.newyear2022Recording} players={players} tourLabel="New Year's 2022 Tour" />
      <ParisSupportingResults results={c.newyear2022SupportingResults} players={players} tourLabel="New Year's 2022 Tour" />
      <HalloweenRecording comparison={c.singapore2022Recording} players={players} tourLabel="Singapore Tour" />
      <ParisSupportingResults results={c.singapore2022SupportingResults} players={players} tourLabel="Singapore Tour" />
      <HalloweenRecording comparison={c.wariowaluigi2022Recording} players={players} tourLabel="Wario vs. Waluigi Tour" />
      <ParisSupportingResults results={c.wariowaluigi2022SupportingResults} players={players} tourLabel="Wario vs. Waluigi Tour" />
      <HalloweenRecording comparison={c.losangeles2022Recording} players={players} tourLabel="Los Angeles Tour (2022)" />
      <ParisSupportingResults results={c.losangeles2022SupportingResults} players={players} tourLabel="Los Angeles Tour (2022)" />
      <HalloweenRecording comparison={c.sky2022Recording} players={players} tourLabel="Sky Tour" />
      <ParisSupportingResults results={c.sky2022SupportingResults} players={players} tourLabel="Sky Tour" />
      <HalloweenRecording comparison={c.supermario2020Recording} players={players} tourLabel="Super Mario Kart Tour (2020)" completed={c.supermario2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.supermarioSupportingResults} players={players} tourLabel="Super Mario Kart Tour (2020)" />
      <HalloweenRecording comparison={c.summerfest2020Recording} players={players} tourLabel="Summer Festival Tour (2020)" completed={c.summerfest2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.summerfestSupportingResults} players={players} tourLabel="Summer Festival Tour (2020)" />
      <HalloweenRecording comparison={c.pirate2020Recording} players={players} tourLabel="Pirate Tour (2020)" completed={c.pirate2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.pirateSupportingResults} players={players} tourLabel="Pirate Tour (2020)" />
      <HalloweenRecording comparison={c.wildwest2020Recording} players={players} tourLabel="Wild West Tour (2020)" completed={c.wildwest2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.wildwestSupportingResults} players={players} tourLabel="Wild West Tour (2020)" />
      <HalloweenRecording comparison={c.exploration2020Recording} players={players} tourLabel="Exploration Tour (2020)" completed={c.exploration2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.explorationSupportingResults} players={players} tourLabel="Exploration Tour (2020)" />
      <HalloweenRecording comparison={c.marine2020Recording} players={players} tourLabel="Marine Tour (2020)" completed={c.marine2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.marineSupportingResults} players={players} tourLabel="Marine Tour (2020)" />
      <HalloweenRecording comparison={c.peach2020Recording} players={players} tourLabel="Peach Tour (2020)" completed={c.peach2020Recording?.practicalReviewComplete === true} />
      <ParisSupportingResults results={c.peachSupportingResults} players={players} tourLabel="Peach Tour (2020)" />
      {fragments.length > 0 && <section className="fastest-video">
        <h2>Preserved video fragments</h2>
        {fragments.map(f => <div key={f.originalUrl}>
          <p><strong>{f.record.time}</strong> · <Player id={f.record.playerId} players={players} /> · {f.description}</p>
          <p className="video-links">
            <a href={f.originalUrl} target="_blank" rel="noopener noreferrer">Original fragment</a>
            {f.backupUrl && <> · <a href={f.backupUrl} target="_blank" rel="noopener noreferrer">Backup fragment (SuperFX64 · unlisted)</a></>}
          </p>
        </div>)}
      </section>}
      <h2>History</h2>
      {c.halloween2019Recording && <p className="table-note">Halloween Tour (2019) opening day: only the fastest documented run at day’s end is shown, including ties. Earlier opening-day submissions remain in the downloadable source archive. Runs with unresolved dates remain under review.</p>}
      {c.paris2019Recording && <p className="table-note">Paris Tour (2019) opening day: only the fastest documented run at day’s end is shown, including ties. Earlier opening-day submissions remain in the downloadable source archive.</p>}
      <RecordTable records={c.records} events={events} players={players} />
      <DateKey />
      <p className="table-note">
        Records are confirmed by WR announcements or explicit community WR
        confirmation. Exact dates remain unknown for some migrated records.
      </p>
      <details className="sources">
        <summary>Record sources &amp; archive data</summary>
        <ul>
          {c.records.map((r) => (
            <li key={r.id}>
              <a href={r.source.url}>
                {r.time} · {players.find((p) => p.id === r.playerId)?.name}
              </a>
              {r.tourLabel ? ` — ${r.tourLabel}` : ""}
              {r.evidenceNote ? <div>{r.evidenceNote}</div> : null}
            </li>
          ))}
        </ul>
        <p>
          <a href={`/data/courses/${c.id}.json`} download>
            Download course JSON
          </a>{" "}
          · <a href={c.wiki}>Course reference</a>
        </p>
        <p>
          Other submissions are preserved for research. They are excluded from
          WR history and rankings until their WR status is confirmed.
        </p>
      </details>
    </>
  );
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
