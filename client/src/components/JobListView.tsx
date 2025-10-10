interface JobPosting {
  label: string;
  relevance?: number;
  location?: string;
  keywords?: string[];
  vector?: number[];
}

export default function JobListView({
  items,
  onSelect,
  selectedIndex,
}: {
  items: JobPosting[];
  onSelect?: (i: number) => void;
  selectedIndex?: number | null;
}) {
  const sortedItems = [...items].sort(
    (a, b) => (b.relevance || 0) - (a.relevance || 0)
  );

  return (
    <div className="job-list-view">
      <div className="job-list-header">
        <span>Position</span>
        <span>Location</span>
        <span>Match</span>
      </div>
      <div className="job-list-items">
        {sortedItems.slice(0, 10).map((item, idx) => {
          const originalIndex = items.findIndex((i) => i.label === item.label);
          const isSelected = selectedIndex === originalIndex;
          const relevancePercent = Math.round((item.relevance || 0) * 100);

          const parts = item.label.split(" - ");
          const title = parts[0] || item.label;
          const company = parts[1] || "";

          return (
            <div
              key={idx}
              className={`job-list-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect?.(originalIndex)}
            >
              <div className="job-info">
                <div className="job-title">{title}</div>
                <div className="job-company">{company}</div>
                {item.keywords && item.keywords.length > 0 && (
                  <div className="job-keywords">
                    {item.keywords.slice(0, 3).map((keyword, i) => (
                      <span key={i} className="keyword-tag">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="job-location">{item.location || "N/A"}</div>
              <div className="job-match">
                <div className="match-bar-container">
                  <div
                    className="match-bar"
                    style={{ width: `${relevancePercent}%` }}
                  />
                </div>
                <span className="match-value">{relevancePercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="job-list-footer">
        Showing top 10 of {items.length} postings
      </div>
    </div>
  );
}
