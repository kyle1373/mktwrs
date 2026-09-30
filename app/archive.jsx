"use client";
import { useState } from "react";
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
        r.dateBasis === "submission-date"
          ? "Date posted in the original submission"
          : r.dateBasis === "proof-upload-date"
            ? "Proof upload date within the recorded tour; achievement date unconfirmed"
            : r.tourDateRange
              ? `Set during ${r.tourDateRange.start} – ${r.tourDateRange.end}; exact day unknown`
              : undefined
      }
    >
      {date(r.recordDate || r.achievedAt)}

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
function Time({ record: r }) {
  return r?.video ? (
    <a
      className="time"
      href={r.video}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Watch video proof for ${r.time}`}
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
}
function Player({ id, players }) {
  const p = players.find((p) => p.id === id);
  return p ? <a href={`/player/${p.id}`}>{p.name}</a> : "—";
}
function Proof({ r }) {
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
  return <a href={`/course/${c.id}`}>{c.name}</a>;
}
function Notice() {
  return (
    <p className="notice">
      History reconstruction in progress. Only confirmed WRs are listed.{" "}
      <a href="/archive">Source coverage</a>.
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
      opens image proof.
    </p>
  );
}
function Sidebar({ index }) {
  const [q, setQ] = useState("");
  let letter = "";
  return (
    <aside id="sidebar">
      <a
        className="brand"
        href="/"
        aria-label="Mario Kart Tour World Records home"
      >
        <img src="/assets/ui/mkt-logo.png" alt="Mario Kart Tour" />
        <span>World Record History</span>
      </a>
      <nav className="navbox" aria-label="Statistics">
        <strong>Stats</strong>
        <a href="/">Current WRs</a>
        <a href="/rankings">Player Rankings</a>
        <a href="/players">Player Profiles</a>
        <a href="/tours">Tour Calendar</a>
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
                  <a href={`/course/${c.id}`}>{c.name}</a>
                </div>
              );
            })}
        </nav>
      </div>
      <nav className="navbox" aria-label="Archive">
        <strong>Other</strong>
        <a href="/archive">About this Archive</a>
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
            {showCourse && <th>Course</th>}
            <th>Date</th>
            <th>Time</th>
            <th>Player</th>
            <th>Nation</th>
            <th title="Playable days">Days</th>
            <th>Lap 1</th>
            <th>Lap 2</th>
            <th className="proof-column" aria-label="Image proof" />
          </tr>
        </thead>
        <tbody>
          {entries.map((e) =>
            e.type !== "record" ? (
              <tr className="tour-event" key={e.id}>
                <td>{date(e.date)}</td>
                <td colSpan={7}>
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
                  <tr key={r.id}>
                    {showCourse && (
                      <td>
                        <a href={`/course/${r.courseId}`}>{r.courseName}</a>
                      </td>
                    )}
                    <td>
                      <RecordDate r={r} />
                    </td>
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
                  </tr>
                );
              })()
            ),
          )}
          {!entries.length && (
            <tr>
              <td colSpan={showCourse ? 9 : 8}>
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
function CoursePage({ data: c, players, tours, manifest }) {
  const events = historyEvents(c, tours, manifest.updatedAt);
  return (
    <>
      <h1>{c.name}</h1>
      <h2>Current WR:</h2>
      <RecordTable records={c.currentHolders} players={players} />
      <CourseStats c={c} players={players} />
      <h2>History</h2>
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
              <th>Course</th>
              <th>Date</th>
              <th>Time</th>
              <th>Player</th>
              <th>Nation</th>
              <th>Days</th>
              <th>WRs</th>
              <th aria-label="Image proof" />
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
                    <RecordDate r={r} />
                  </td>
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
                  <td className="center">
                    <Duration r={r} />
                  </td>
                  {!i && (
                    <td className="center" rowSpan={c.currentHolders.length}>
                      {c.recordCount}
                    </td>
                  )}
                  <td className="proof-column">
                    <Proof r={r} />
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
        <a href="/rankings">View Player Rankings</a>
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
                    <a href={`/player/${p.id}`}>{p.name}</a>
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
function PlayerPage({ data: p, players }) {
  return (
    <>
      <div className="profile-head">
        {p.avatar && <img className="avatar" src={p.avatar} alt="" />}
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
      <RecordTable records={p.records} players={players} showCourse />
      <DateKey />
      <p>
        <a href="/rankings">Player Rankings</a> ·{" "}
        <a href="/players">All Players</a>
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
                        <a href={`/course/${c.id}`}>{c.name}</a>
                      </span>
                    ))}
                  </td>
                  <td>{t.startDate}</td>
                  <td>{t.endDate}</td>
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
        [ <a href="/">MKTour</a> | <a href="/rankings">Player Rankings</a> |{" "}
        <a href="/tours">Tours</a> | <a href="/archive">Archive</a> ]
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
