type MoneyUnit = "currency" | "percentage" | "count";

interface MoneyMetric {
  label: string;
  value: number;
  displayValue: string;
  signal: string;
  description?: string;
  unit: MoneyUnit;
  unitLabel?: string;
  deltaValue?: number;
  deltaUnit?: MoneyUnit;
  deltaLabel?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatDisplay(
  value: number,
  unit: MoneyUnit,
  unitLabel?: string
): string {
  if (unit === "currency") {
    return formatCurrency(value);
  }
  if (unit === "percentage") {
    const rounded = Number.isFinite(value) ? value : 0;
    const prefix = rounded >= 0 ? "+" : "";
    return `${prefix}${rounded.toFixed(1)}%`;
  }
  const suffix = unitLabel ? ` ${unitLabel}` : "";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function formatDelta(
  value: number | undefined,
  unit: MoneyUnit | undefined,
  unitLabel?: string
): string | null {
  if (value === undefined || unit === undefined) {
    return null;
  }

  const sign = value < 0 ? "-" : "+";
  const abs = Math.abs(value);

  if (unit === "currency") {
    return `${sign}${formatCurrency(abs)}`;
  }

  if (unit === "percentage") {
    return `${sign}${abs.toFixed(1)}%`;
  }

  const suffix = unitLabel ? ` ${unitLabel}` : "";
  return `${sign}${Math.round(abs).toLocaleString()}${suffix}`.trim();
}

function guessUnit(category: string, value: number): MoneyUnit {
  if (/growth|percent/i.test(category)) {
    return "percentage";
  }
  if (/employer|recipient|award count|count/i.test(category)) {
    return "count";
  }
  if (!Number.isFinite(value) || value === 0) {
    return "currency";
  }
  return "currency";
}

export default function MoneyVectorDisplay({
  data,
}: {
  data: Array<{
    category: string;
    value: number;
    signal?: string;
    description?: string;
    unit?: MoneyUnit;
    unitLabel?: string;
    displayValue?: string;
    deltaValue?: number;
    deltaUnit?: MoneyUnit;
    deltaLabel?: string;
  }>;
}) {
  const metrics: MoneyMetric[] = data.map((item) => {
    const unit: MoneyUnit = item.unit ?? guessUnit(item.category, item.value);
    const unitLabel =
      item.unitLabel ?? (unit === "count" ? "employers" : undefined);
    const displayValue =
      item.displayValue ?? formatDisplay(item.value, unit, unitLabel);

    return {
      label: item.category,
      value: item.value,
      displayValue,
      signal: (item.signal || "MEDIUM").toUpperCase(),
      description: item.description,
      unit,
      unitLabel,
      deltaValue: item.deltaValue,
      deltaUnit: item.deltaUnit,
      deltaLabel: item.deltaLabel,
    };
  });
  function normalizeLabel(label: string) {
    return label.replace(/\s*\(\d{4}\)$/, ``).trim();
  }

  const aggMap: Record<string, MoneyMetric> = {};
  metrics.forEach((m) => {
    const base = normalizeLabel(m.label);
    if (!aggMap[base]) {
      aggMap[base] = { ...m, label: base };
    } else {
      aggMap[base].value += m.value;
      const order: Record<string, number> = { low: 0, medium: 1, high: 2 };
      const a = aggMap[base].signal?.toLowerCase() || "medium";
      const b = m.signal?.toLowerCase() || "medium";
      aggMap[base].signal =
        (order[a] ?? 1) >= (order[b] ?? 1)
          ? aggMap[base].signal
          : m.signal?.toUpperCase();
    }
  });

  const aggregated = Object.values(aggMap).map((metric) => ({
    ...metric,
    displayValue:
      metric.displayValue ??
      formatDisplay(metric.value, metric.unit, metric.unitLabel),
  }));

  const currencyMetrics = aggregated.filter((m) => m.unit === "currency");
  const stateLobbyMetric = aggregated.find(
    (m) => m.label.toLowerCase() === "state lobbying"
  );
  const stateGrowthMetric = aggregated.find(
    (m) => m.label.toLowerCase() === "state growth"
  );
  const momentumDelta = formatDelta(
    stateLobbyMetric?.deltaValue,
    stateLobbyMetric?.deltaUnit,
    stateLobbyMetric?.unitLabel
  );
  const momentumValue = momentumDelta ?? stateGrowthMetric?.displayValue ?? "—";
  const momentumNote = stateGrowthMetric
    ? `YoY change ${stateGrowthMetric.displayValue}${
        stateGrowthMetric.deltaLabel ? ` (${stateGrowthMetric.deltaLabel})` : ""
      }`
    : "Year-over-year growth trend";

  return (
    <div className="money-vector-display">
      <div className="financial-metrics">
        {aggregated.map((metric, index) => (
          <div
            key={index}
            className={`metric-card ${
              metric.unit === "currency" ? "large" : "small"
            }`}
          >
            <div className="metric-header">
              <span className="metric-label">{metric.label}</span>
              <span className={`signal-badge ${metric.signal.toLowerCase()}`}>
                {metric.signal}
              </span>
            </div>

            {metric.unit === "currency" ? (
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
                {(
                  currencyMetrics.reduce(
                    (sum: number, m: MoneyMetric) => sum + m.value,
                    0
                  ) / 1e9
                ).toFixed(2)}
                B
              </div>
              <div className="insight-note">Combined lobbying and awards</div>
            </div>
          </div>

          {(stateGrowthMetric || stateLobbyMetric) && (
            <div className="insight-item">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <div className="insight-title">Market Momentum</div>
                <div className="insight-value">{momentumValue}</div>
                <div className="insight-note">{momentumNote}</div>
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
