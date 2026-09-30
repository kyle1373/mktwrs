"use client";
import { useState } from "react";
const date = (s) =>
  s
    ? new Date(s).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
function RecordDate({ r }) {
  return (
    <span
      title={
        r?.dateBasis === "submission-date"
          ? "Original Discord submission date; actual achievement date not documented"
          : undefined
      }
    >
      {date(r?.recordDate || r?.achievedAt)}
      {r?.dateBasis === "submission-date" ? "†" : ""}
    </span>
  );
}
function Duration({ r }) {
  return (
    <span
      title={
        r?.durationDays == null
          ? "Missing dates or intervening record chronology"
          : "Playable calendar days using documented dates; intermediate chronology is incomplete"
      }
    >
      {r?.durationDays == null ? "—" : "~" + r.durationDays.toFixed(0)}
    </span>
  );
}
const flag = (c) =>
  c && /^[a-z]{2}$/i.test(c)
    ? String.fromCodePoint(
        ...c
          .toUpperCase()
          .split("")
          .map((x) => 127397 + x.charCodeAt(0)),
      )
    : "";
function Time({ record }) {
  return record?.video ? (
    <a
      className="time"
      href={record.video}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Watch video proof for ${record.time}`}
    >
      {record.time}
    </a>
  ) : (
    <span className={record ? "time" : "empty"}>{record?.time || "—"}</span>
  );
}
function Player({ id, players }) {
  const p = players.find((p) => p.id === id);
  return p ? (
    <a href={`/player/${p.id}`}>
      <span className="flag">{flag(p.country)}</span>
      {p.name}
    </a>
  ) : (
    <span className="empty">Not yet archived</span>
  );
}
function Course({ c }) {
  const short =
    c.sortName || c.name.replace(/^(SNES|N64|GBA|GCN|DS|Wii|3DS) /, "");
  return (
    <>
      <a href={`/course/${c.id}`}>{short}</a>
      {short !== c.name && (
        <span className="platform">{c.name.split(" ")[0]}</span>
      )}
    </>
  );
}
function Notice() {
  return (
    <div className="notice">
      <strong>Archive in progress.</strong> Submission evidence is being
      reconciled. Unknown dates and mushrooms are shown as —.{" "}
      <a href="/archive">Coverage & methodology</a>
    </div>
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
        <span>MARIO KART</span>
        <strong>TOUR</strong>
        <small>WORLD RECORDS</small>
      </a>
      <nav className="navbox">
        <a href="/">World Records</a>
        <a href="/players">Player Profiles</a>
        <a href="/tours">Tour Calendar</a>
        <a href="/archive">About the Archive</a>
      </nav>
      <div className="navbox courses-nav">
        <label htmlFor="course-search">Time Trial courses</label>
        <input
          id="course-search"
          type="search"
          placeholder="Find a course…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <nav aria-label="Courses">
          {index
            .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
            .map((c) => {
              const l = c.sortName[0].toUpperCase(),
                header = l !== letter;
              letter = l;
              return (
                <div key={c.id}>
                  {header && <div className="letter">{l}</div>}
                  <a href={`/course/${c.id}`}>
                    {c.sortName}
                    {c.name !== c.sortName && (
                      <span className="full-name">
                        {" "}
                        ({c.name.split(" ")[0]})
                      </span>
                    )}
                  </a>
                </div>
              );
            })}
        </nav>
      </div>
    </aside>
  );
}
function Home({ data, players }) {
  const [q, setQ] = useState("");
  const filtered = data.filter((c) =>
    (
      c.name +
      " " +
      c.currentHolders
        .map((r) => players.find((p) => p.id === r.playerId)?.name || "")
        .join(" ")
    )
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <h1>Mario Kart Tour World Records</h1>
      <p>Time Trial records, course histories and the players behind them.</p>
      <Notice />
      <div className="toolbar">
        <div>
          <strong>Best archived records</strong>{" "}
          <span className="meta">· Alphabetical by course</span>
        </div>
        <input
          type="search"
          aria-label="Search records"
          placeholder="Search courses or players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table className="records-table">
          <thead>
            <tr>
              <th>Course</th>
              <th className="number">Time</th>
              <th>Player</th>
              <th>Date</th>
              <th className="number">Playable days</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="course-cell">
                    {c.image && (
                      <img
                        className="course-thumb"
                        src={c.image}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    <span>
                      <Course c={c} />
                    </span>
                  </div>
                </td>
                <td className="number">
                  {c.currentHolders.map((r) => (
                    <div key={r.id}>
                      <Time record={r} />
                    </div>
                  ))}
                </td>
                <td>
                  {c.currentHolders.map((r) => (
                    <div key={r.id}>
                      <Player id={r.playerId} players={players} />
                    </div>
                  ))}
                </td>
                <td>
                  {c.currentHolders.map((r) => (
                    <div key={r.id}>
                      <RecordDate r={r} />
                    </div>
                  ))}
                </td>
                <td className="number">
                  {c.currentHolders.map((r) => (
                    <div key={r.id}>
                      <Duration r={r} />
                    </div>
                  ))}
                </td>
                <td>
                  <a href={`/course/${c.id}`}>
                    {c.recordCount ? `${c.recordCount} records` : "View course"}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">
        {filtered.length} courses · Times link to video proof. † Submission
        date. ~ Provisional playable days.
      </p>
    </>
  );
}
function Submissions({ rows, players, showCourse = false }) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(0);
  const filtered = rows.filter((r) =>
    (
      players.find((p) => p.id === r.playerId)?.name +
      " " +
      r.time +
      " " +
      (r.courseName || "")
    )
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const shown = filtered.slice(page * 50, (page + 1) * 50);
  return (
    <>
      <div className="toolbar">
        <span className="meta">{filtered.length} archived submissions</span>
        <input
          type="search"
          aria-label="Search submissions"
          placeholder="Find a player or time…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {showCourse && <th>Course</th>}
              <th>Player</th>
              <th className="number">Time</th>
              <th>Splits</th>
              <th>Shrooms</th>
              <th>Record date</th>
              <th>Submitted</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                {showCourse && (
                  <td>
                    <a href={`/course/${r.courseId}`}>{r.courseName}</a>
                  </td>
                )}
                <td>
                  <Player id={r.playerId} players={players} />
                </td>
                <td className="number">
                  <Time record={r} />
                </td>
                <td title={r.notes?.join(" ")}>
                  {r.laps?.map((l) => l ?? "—").join(" / ") || "—"}
                  {r.notes?.some((n) => n.includes("do not sum")) ? " ⚠" : ""}
                </td>
                <td>{r.mushrooms?.join(" / ") || "—"}</td>
                <td>{date(r.achievedAt)}</td>
                <td>{date(r.submittedAt)}</td>
                <td>
                  <a
                    href={r.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.source.range || "Discord"}
                  </a>
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={8} className="empty-state">
                  No matching submissions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && (
        <div className="pagination">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.ceil(filtered.length / 50)}
          </span>
          <button
            disabled={(page + 1) * 50 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
function CoursePage({ data: c, players, tours }) {
  return (
    <>
      <p className="breadcrumb">
        <a href="/">All courses</a> / {c.name}
      </p>
      <div className="course-head">
        {c.image && <img src={c.image} alt={c.name} />}
        <div>
          <h1>{c.name}</h1>
          <p>
            Time Trial · {c.driver} · {c.kart}
          </p>
          <div className="meta">
            {c.appearances.length} documented tour appearances
          </div>
        </div>
      </div>
      {c.current && (
        <div className="stats">
          <div>
            <strong>
              <Time record={c.current} />
            </strong>
            <span>Best archived time</span>
          </div>
          <div>
            <strong>
              {c.currentHolders.map((r) => (
                <div key={r.id}>
                  <Player id={r.playerId} players={players} />
                </div>
              ))}
            </strong>
            <span>Archived record holders</span>
          </div>
          <div>
            <strong>{c.submissions.length}</strong>
            <span>Archived submissions</span>
          </div>
        </div>
      )}
      <Notice />
      <h2>World record history</h2>
      <p className="meta">
        WR announcements and reconstructed contenders. Contenders match or beat
        the best record documented before their submission; their WR status
        remains provisional. Ordered by source posting until achievement dates
        are verified.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="number">Time</th>
              <th>Player</th>
              <th>Splits</th>
              <th>Shrooms</th>
              <th>Date</th>
              <th>Playable days</th>
              <th>Source posted</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {[...c.records].reverse().map((r, i) => (
              <tr key={r.id}>
                <td className="number">{c.records.length - i}</td>
                <td className="number">
                  <Time record={r} />
                </td>
                <td>
                  <Player id={r.playerId} players={players} />
                </td>
                <td>{r.laps?.map((l) => l ?? "—").join(" / ") || "—"}</td>
                <td>{r.mushrooms?.join(" / ") || "—"}</td>
                <td>
                  <RecordDate r={r} />
                </td>
                <td className="number">
                  <Duration r={r} />
                </td>
                <td>
                  <a
                    href={r.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {date(r.announcedAt)}
                  </a>
                </td>
                <td>
                  {r.status === "announced" ? "WR announcement" : "Contender"}
                </td>
              </tr>
            ))}
            {!c.records.length && (
              <tr>
                <td colSpan={9} className="empty-state">
                  No WR announcement imported yet. Preserved submission evidence
                  is available below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h2>All archived submissions</h2>
      <p className="meta">
        These include personal bests and possible intermediate records. A
        missing date is not inferred from row order. ⚠ marks source splits that
        do not add up to the total.
      </p>
      <Submissions rows={c.submissions} players={players} />
      <h2>When this Time Trial was playable</h2>
      <p className="meta">
        Tour end dates are exclusive. The record clock pauses between
        appearances.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tour</th>
              <th>From</th>
              <th>Until</th>
              <th>Cup</th>
            </tr>
          </thead>
          <tbody>
            {c.appearances.map((a) => {
              const t = tours.find((t) => t.id === a.tourId);
              return (
                <tr key={a.tourId + "-" + a.cup}>
                  <td>
                    <a href={t.source}>
                      {t.name} · {t.startDate.slice(0, 4)}
                    </a>
                  </td>
                  <td>{date(a.startDate)}</td>
                  <td>{date(a.endDate)}</td>
                  <td>{a.cup}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="meta">
        <a className="download" href={`/data/courses/${c.id}.json`} download>
          Download course JSON
        </a>
        <a href={c.wiki}>Course reference</a>
      </p>
    </>
  );
}
function PlayersPage({ data }) {
  const [q, setQ] = useState("");
  const filtered = data.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <h1>Player Profiles</h1>
      <p>Players represented in the archived records and submissions.</p>
      <Notice />
      <div className="toolbar">
        <span className="meta">{filtered.length} players</span>
        <input
          type="search"
          aria-label="Search players"
          placeholder="Find a player…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th className="number">Best archived records</th>
              <th className="number">Courses</th>
              <th className="number">Submissions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <a href={`/player/${p.id}`}>
                    <span className="flag">{flag(p.country)}</span>
                    {p.name}
                  </a>
                </td>
                <td className="number">{p.bestCount}</td>
                <td className="number">{p.courseCount}</td>
                <td className="number">{p.submissionCount}</td>
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
      <p className="breadcrumb">
        <a href="/players">All players</a> / {p.name}
      </p>
      <div className="profile-head">
        {p.avatar ? (
          <img className="avatar" src={p.avatar} alt="" />
        ) : (
          <div className="avatar" aria-hidden="true">
            {p.name[0]}
          </div>
        )}
        <div>
          <h1>{p.name}</h1>
          <p>{flag(p.country)} Mario Kart Tour Time Trial player</p>
          {p.socials && (
            <p>
              {Object.entries(p.socials)
                .filter(([, url]) => url)
                .map(([name, url]) => (
                  <a
                    key={name}
                    className="download"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {name[0].toUpperCase() + name.slice(1)}
                  </a>
                ))}
            </p>
          )}
        </div>
      </div>
      <div className="stats">
        <div>
          <strong>{p.records.length}</strong>
          <span>Archived WR observations</span>
        </div>
        <div>
          <strong>
            {
              new Set([...p.records, ...p.submissions].map((r) => r.courseId))
                .size
            }
          </strong>
          <span>Courses</span>
        </div>
        <div>
          <strong>{p.submissions.length}</strong>
          <span>Submissions</span>
        </div>
      </div>
      <Notice />
      <h2>World record history</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th className="number">Time</th>
              <th>Splits</th>
              <th>Date</th>
              <th>Source posted</th>
            </tr>
          </thead>
          <tbody>
            {[...p.records]
              .sort((a, b) => b.announcedAt.localeCompare(a.announcedAt))
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href={`/course/${r.courseId}`}>{r.courseName}</a>
                  </td>
                  <td className="number">
                    <Time record={r} />
                  </td>
                  <td>{r.laps?.map((l) => l ?? "—").join(" / ") || "—"}</td>
                  <td>{date(r.achievedAt)}</td>
                  <td>
                    <a href={r.source.url}>{date(r.announcedAt)}</a>
                  </td>
                </tr>
              ))}
            {!p.records.length && (
              <tr>
                <td className="empty-state" colSpan={5}>
                  No WR announcement is currently attributed to this player.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h2>Submission history</h2>
      <Submissions rows={p.submissions} players={players} showCourse />
    </>
  );
}
function ToursPage({ data }) {
  return (
    <>
      <h1>Time Trial Tour Calendar</h1>
      <p>Documented tours and their Time Trial bonus challenges.</p>
      <p className="meta">
        End dates are exclusive. Reruns inherit the Time Trial lineup listed for
        their original tour.
      </p>
      <div className="table-wrap">
        <table className="tour-list">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Time Trial courses</th>
              <th>From</th>
              <th>Until</th>
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
                  <td>{date(t.startDate)}</td>
                  <td>{date(t.endDate)}</td>
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
          beginning, including migrated records from 2019. Older individual
          submissions, discussions, mushroom allocations and missing achievement
          dates still need reconciliation. “Best archived” means the fastest WR
          observation currently preserved, not a guarantee of exhaustive
          history.
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
          Where the achievement date is absent, a known original submission date
          is marked †. Provisional playable-day totals are marked ~ and use the
          documented calendar dates. Totals stay blank when a faster archived
          record has no known date; incomplete intermediate chronology may still
          change provisional totals. The calendar uses the wiki’s dates for Time
          Trial bonus challenges rather than ordinary race availability.
        </p>
        <h2>Proof and splits</h2>
        <p>
          Only video proof is linked from the displayed time. Screenshot
          references remain in the JSON data. Missing splits and mushrooms are
          unknown, never zero. A warning beside source splits means they do not
          sum to the total; inconsistent splits are not promoted to a WR row.
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
  const views = {
    home: Home,
    course: CoursePage,
    players: PlayersPage,
    player: PlayerPage,
    tours: ToursPage,
    archive: About,
  };
  const View = views[props.view];
  return (
    <>
      <a className="skip" href="#main">
        Skip to records
      </a>
      <Sidebar index={props.index} />
      <main id="main">
        <header className="topbar">
          <span>Mario Kart Tour</span>
          <nav>
            <a href="/">[ Records ]</a> <a href="/players">[ Players ]</a>{" "}
            <a href="/archive">[ Archive ]</a>
          </nav>
        </header>
        <View {...props} />
        <footer>
          Mario Kart Tour World Records · Independent community archive
          <br />
          Mario Kart and course artwork © Nintendo. Tour reference data:{" "}
          <a href="https://www.mariowiki.com/Time_Trial_(Mario_Kart_Tour)">
            Super Mario Wiki
          </a>
          .
        </footer>
      </main>
    </>
  );
}
