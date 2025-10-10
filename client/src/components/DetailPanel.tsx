import { topKSimilar } from "../utils/similarity";

interface JobItem {
  label: string;
  vector: number[];
  relevance?: number;
  location?: string;
  keywords?: string[];
  postedAt?: string;
  source?: string;
}

export default function DetailPanel({
  items,
  selectedIndex,
}: {
  items: JobItem[];
  selectedIndex: number | null;
}) {
  if (selectedIndex === null)
    return (
      <div className="card detail-empty">
        <div className="empty-state">
          <div className="empty-icon">👈</div>
          <div className="empty-text">Select a job posting</div>
          <div className="empty-subtext">
            Click any job to see details and similar positions
          </div>
        </div>
      </div>
    );

  const item = items[selectedIndex];
  const top = topKSimilar(items, selectedIndex, 3);

  const parts = item.label.split(" - ");
  const title = parts[0] || item.label;
  const company = parts[1] || "";

  const formatDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="card detail-panel">
      <div className="detail-header">
        <div className="detail-title">{title}</div>
        <div className="detail-company">{company}</div>
        {item.location && (
          <div className="detail-location">📍 {item.location}</div>
        )}
      </div>

      {(item.postedAt || item.source) && (
        <div className="detail-section detail-meta">
          {item.postedAt && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Posted</span>
              <span className="detail-meta-value">
                {formatDate(item.postedAt)}
              </span>
            </div>
          )}
          {item.source && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Source</span>
              <span className="detail-meta-value">{item.source}</span>
            </div>
          )}
        </div>
      )}

      {item.keywords && item.keywords.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">Detected Keywords</div>
          <div className="detail-keywords">
            {item.keywords.map((keyword, i) => (
              <span key={i} className="detail-keyword-tag">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.relevance !== undefined && (
        <div className="detail-section">
          <div className="detail-section-title">Relevance Score</div>
          <div className="detail-relevance">
            <div className="relevance-bar-bg">
              <div
                className="relevance-bar-fill"
                style={{ width: `${Math.round((item.relevance || 0) * 100)}%` }}
              />
            </div>
            <span className="relevance-percent">
              {Math.round((item.relevance || 0) * 100)}%
            </span>
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">Similar Positions</div>
        <div className="similar-jobs">
          {top.map((t) => {
            const similarParts = t.label.split(" - ");
            const similarTitle = similarParts[0] || t.label;
            const similarCompany = similarParts[1] || "";

            return (
              <div key={t.i} className="similar-job-item">
                <div className="similar-job-title">{similarTitle}</div>
                <div className="similar-job-company">{similarCompany}</div>
                <div className="similar-job-score">
                  Match: {Math.round(t.score * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
