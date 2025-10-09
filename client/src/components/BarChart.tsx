type BarItem = { label: string; value: number };

export default function BarChart({
  data,
  width = 400,
  height = 220,
}: {
  data: BarItem[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const margin = { top: 12, right: 12, bottom: 70, left: 8 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const barWidth = innerW / data.length;

  const truncateLabel = (label: string, maxLength = 12) => {
    return label.length > maxLength
      ? label.substring(0, maxLength) + "..."
      : label;
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Bar chart"
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = i * barWidth;
          const y = innerH - h;
          return (
            <g key={d.label}>
              <rect
                x={x + 6}
                y={y}
                width={barWidth - 12}
                height={h}
                fill="#3db5e6"
                rx={6}
              />
              <text
                x={x + barWidth / 2}
                y={innerH + 14}
                fontSize={11}
                fill="#475569"
                textAnchor="end"
                transform={`rotate(-45, ${x + barWidth / 2}, ${innerH + 14})`}
              >
                {truncateLabel(d.label.toUpperCase())}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
