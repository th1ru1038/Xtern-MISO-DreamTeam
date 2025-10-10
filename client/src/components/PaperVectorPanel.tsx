import LineChart from "./LineChart";
import type {
  PaperVectorData,
  PaperVectorItem,
  PaperVectorTrendPoint,
} from "../types/data";

interface PaperVectorPanelProps {
  data: PaperVectorData;
  isFallback?: boolean;
}

const formatChange = (value: number) => {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
};

const formatScore = (value: number) => `${Math.round(value * 10) / 10}`;

const buildTrendPoints = (trend: PaperVectorTrendPoint[]) => {
  if (!trend.length) {
    return [];
  }

  return trend.map((point, index) => ({
    x: point.date || `T${index + 1}`,
    y: Number.isFinite(point.score) ? point.score : 0,
  }));
};

const describeTopic = (topic: PaperVectorItem) => {
  const signals: string[] = [];
  if (topic.econSignificant) {
    signals.push("Economically Significant");
  }
  if (topic.whiteHouseHits > 0) {
    signals.push(`White House mentions: ${topic.whiteHouseHits}`);
  }
  if (topic.executiveOrderHits > 0) {
    signals.push(`Executive actions: ${topic.executiveOrderHits}`);
  }
  return signals;
};

export default function PaperVectorPanel({
  data,
  isFallback = false,
}: PaperVectorPanelProps) {
  const hasTopics = data.topics.length > 0;
  const activeTopics = data.topics.filter((topic) => {
    return (
      topic.score !== 0 ||
      topic.change30d !== 0 ||
      topic.frNotices !== 0 ||
      topic.commentRate14d !== 0 ||
      topic.underReview !== 0 ||
      topic.econSignificant ||
      topic.whiteHouseHits !== 0 ||
      topic.executiveOrderHits !== 0
    );
  });

  const topics = (activeTopics.length > 0 ? activeTopics : data.topics).slice(
    0,
    5
  );
  const quietTopics = data.topics.filter(
    (topic) => !activeTopics.includes(topic)
  );
  const trendPoints = buildTrendPoints(data.trend);

  const latestTrend = trendPoints.at(-1)?.y ?? 0;
  const baselineTrend = trendPoints[0]?.y ?? 0;
  const trendDelta = latestTrend - baselineTrend;

  return (
    <div className="paper-panel">
      <header className="paper-header">
        <div>
          <h2>Paper Vector - Regulatory Activity</h2>
          <p>
            Tracking federal rulemaking momentum and topic-level engagement.
          </p>
        </div>
        {isFallback && (
          <span className="data-fallback">
            Showing sample paper vector data
          </span>
        )}
      </header>

      {!hasTopics ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <div className="empty-text">No regulatory topics detected</div>
          <div className="empty-subtext">
            Paper vector data will appear once rulemaking activity is processed.
          </div>
        </div>
      ) : (
        <div className="paper-grid">
          <div className="paper-trend">
            <div className="paper-subheader">
              <h3>90-Day Momentum Trend</h3>
              <div
                className={`paper-trend-delta ${
                  trendDelta > 0
                    ? "positive"
                    : trendDelta < 0
                    ? "negative"
                    : "neutral"
                }`}
              >
                Δ {formatChange(trendDelta)} pts
              </div>
            </div>
            <div className="paper-trend-chart">
              {trendPoints.length > 1 ? (
                <LineChart data={trendPoints} height={180} />
              ) : (
                <div className="paper-trend-empty">
                  Not enough data for trend.
                </div>
              )}
            </div>
            <div className="paper-trend-stats">
              <span>
                Latest momentum score:{" "}
                <strong>{formatScore(latestTrend)}</strong>
              </span>
              <span>
                Baseline: <strong>{formatScore(baselineTrend)}</strong>
              </span>
            </div>
          </div>

          <div className="paper-topics">
            <h3>Top Regulatory Topics</h3>
            <ul className="paper-topic-list">
              {topics.map((topic) => {
                const signals = describeTopic(topic);
                const changeClass =
                  topic.change30d > 0
                    ? "positive"
                    : topic.change30d < 0
                    ? "negative"
                    : "neutral";
                return (
                  <li
                    key={topic.topic || topic.title}
                    className="paper-topic-row"
                  >
                    <div className="paper-topic-header">
                      <div className="paper-topic-title">{topic.title}</div>
                      <div className="paper-topic-score">
                        Score
                        <strong>{formatScore(topic.score)}</strong>
                      </div>
                    </div>
                    <div className="paper-topic-metrics">
                      <span className={`paper-change ${changeClass}`}>
                        30d:{" "}
                        <strong>{formatChange(topic.change30d)} pts</strong>
                      </span>
                      <span>FR notices: {Math.round(topic.frNotices)}</span>
                      <span>
                        Comments (14d): {Math.round(topic.commentRate14d)}
                      </span>
                      <span>Under review: {Math.round(topic.underReview)}</span>
                    </div>
                    {signals.length > 0 && (
                      <div className="paper-topic-signals">
                        {signals.map((signal) => (
                          <span key={signal} className="paper-badge">
                            {signal}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {activeTopics.length === 0 && hasTopics && (
              <div className="paper-quiet-message">
                All tracked topics are currently quiet. Showing most recent
                coverage for context.
              </div>
            )}
            {quietTopics.length > 0 && activeTopics.length > 0 && (
              <div className="paper-quiet-message">
                {quietTopics.length} additional topic
                {quietTopics.length === 1 ? " is" : "s are "}
                currently quiet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
