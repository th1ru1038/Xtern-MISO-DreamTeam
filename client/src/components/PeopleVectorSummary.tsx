import type { PeopleSignalSummary } from "../utils/peopleInsights";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signalClass(label: PeopleSignalSummary["signalLabel"]): string {
  return label.toLowerCase();
}

export default function PeopleVectorSummary({
  summary,
}: {
  summary: PeopleSignalSummary;
}) {
  const latestDate = summary.lastPostingDate
    ? new Date(summary.lastPostingDate)
    : null;

  const latestDateLabel = latestDate
    ? latestDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="people-summary">
      <div className="people-summary-tile signal">
        <div className={`signal-pill ${signalClass(summary.signalLabel)}`}>
          {summary.signalLabel}
        </div>
        <div className="tile-value">{formatPercent(summary.signalScore)}</div>
        <div className="tile-label">High-match hiring pulse</div>
        <div className="tile-note">
          {summary.highRelevanceCount} of {summary.totalPostings} postings align
          with energy keywords.
        </div>
        <div className="tile-subnote">
          {summary.anyKeywordCount} postings contain at least one energy keyword
          (broader match).
        </div>
      </div>

      <div className="people-summary-tile velocity">
        <div className="tile-label">Hiring velocity (14d)</div>
        <div className="tile-value">
          {summary.recentPostings}
          <span className="tile-subvalue"> / {summary.totalPostings}</span>
        </div>
        <div className="tile-note">Latest posting: {latestDateLabel}</div>
      </div>

      <div className="people-summary-tile coverage">
        <div className="tile-label">Keyword intensity</div>
        <div className="tile-value">{summary.avgKeywords.toFixed(1)}</div>
        <div className="tile-note">
          Average energy keywords detected per listing across{" "}
          {summary.sourcesTracked} sources.
        </div>
      </div>

      <div className="people-summary-tile employers">
        <div className="tile-label">Top hiring orgs</div>
        <ul className="tile-list">
          {summary.topEmployers.length > 0 ? (
            summary.topEmployers.map((employer) => (
              <li key={employer.name}>
                <span className="list-name">{employer.name}</span>
                <span className="list-value">{employer.count}</span>
              </li>
            ))
          ) : (
            <li className="list-empty">No employers detected</li>
          )}
        </ul>
      </div>
    </div>
  );
}
