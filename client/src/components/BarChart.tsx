type BarItem = { label: string; value: number };

export default function BarChart({
  data,
  width = 400,
  height = 180,
}: {
  data: BarItem[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const margin = { top: 12, right: 12, bottom: 30, left: 8 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const barWidth = innerW / data.length;

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
                fill="#7c86ff"
                rx={6}
              />
              <text
                x={x + barWidth / 2}
                y={innerH + 18}
                fontSize={12}
                fill="#cbd5e1"
                textAnchor="middle"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
