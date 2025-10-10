interface MoneyMetric {
  label: string;
  value: number;
  displayValue: string;
  signal: string;
  description?: string;
  category: "dollar" | "percentage" | "count";
}

function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function MoneyVectorDisplay({
  data,
}: {
  data: Array<{
    category: string;
    value: number;
    signal?: string;
    description?: string;
  }>;
}) {
  const metrics: MoneyMetric[] = data.map((item) => {
    let displayValue = "";
    let category: "dollar" | "percentage" | "count" = "dollar";

    if (item.category.toLowerCase().includes("growth")) {
      displayValue = `+${item.value.toFixed(1)}%`;
      category = "percentage";
    } else if (item.category.toLowerCase().includes("employers")) {
      displayValue = `${item.value}`;
      category = "count";
    } else {
      displayValue = formatCurrency(item.value);
      category = "dollar";
    }

    return {
      label: item.category,
      value: item.value,
      displayValue,
      signal: (item.signal || "MEDIUM").toUpperCase(),
      description: item.description,
      category,
    };
  });
  // normalize categories: strip year suffixes like ' (2024)' to aggregate
  function normalizeLabel(label: string) {
    return label.replace(/\s*\(\d{4}\)$/, ``).trim()
  }

  // aggregate metrics with the same normalized label
  const aggMap: Record<string, MoneyMetric> = {}
  metrics.forEach((m) => {
    const base = normalizeLabel(m.label)
    if (!aggMap[base]) {
      aggMap[base] = { ...m, label: base }
    } else {
      // sum numeric value
      aggMap[base].value += m.value
      // pick highest signal
      const order: Record<string, number> = { low: 0, medium: 1, high: 2 }
      const a = aggMap[base].signal?.toLowerCase() || 'medium'
      const b = m.signal?.toLowerCase() || 'medium'
      aggMap[base].signal = (order[a] ?? 1) >= (order[b] ?? 1) ? aggMap[base].signal : m.signal?.toUpperCase()
    }
  })

  const aggregated = Object.values(aggMap)

  const otherMetrics = aggregated.filter((m) => m.category !== "dollar");

  return (
    <div className="money-vector-display">
      <div className="financial-metrics">
        {aggregated.map((metric, index) => (
          <div
            key={index}
            className={`metric-card ${metric.category === 'dollar' ? 'large' : 'small'}`}
          >
            <div className="metric-header">
              <span className="metric-label">{metric.label}</span>
              <span className={`signal-badge ${metric.signal.toLowerCase()}`}>
                {metric.signal}
              </span>
            </div>

            {metric.category === 'dollar' ? (
              <div className="metric-value-large">{metric.displayValue}</div>
            ) : (
              <div className="metric-value-medium">{metric.displayValue}</div>
            )}

            {metric.description && (
              <div className="metric-description">{metric.description}</div>
            )}
          </div>
        ))}
      </div>

      <div className="money-insights">
        <div className="insight-header">Key Insights</div>
        <div className="insight-grid">
          <div className="insight-item">
            <div className="insight-icon">💰</div>
            <div className="insight-content">
              <div className="insight-title">Total Federal Activity</div>
              <div className="insight-value">
                $
                {(metrics.reduce((sum: number, m: MoneyMetric) => sum + m.value, 0) / 1e9).toFixed(2)}
                B
              </div>
              <div className="insight-note">Combined lobbying and awards</div>
            </div>
          </div>

          {otherMetrics.find((m) => m.category === "percentage") && (
            <div className="insight-item">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <div className="insight-title">Market Momentum</div>
                <div className="insight-value">
                  {
                    otherMetrics.find((m) => m.category === "percentage")
                      ?.displayValue
                  }
                </div>
                <div className="insight-note">Year-over-year growth trend</div>
              </div>
            </div>
          )}

          <div className="insight-item">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-title">Signal Strength</div>
              <div className="insight-value">
                {metrics.filter((m) => m.signal === "HIGH").length}/
                {metrics.length} HIGH
              </div>
              <div className="insight-note">Active momentum indicators</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
