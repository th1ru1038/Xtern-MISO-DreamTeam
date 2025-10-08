type Point = { x: string; y: number };

export default function LineChart({
  data,
  width = 480,
  height = 160,
}: {
  data: Point[];
  width?: number;
  height?: number;
}) {
  const maxY = Math.max(...data.map((d) => d.y), 1);
  const margin = { top: 8, right: 12, bottom: 24, left: 8 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const stepX = innerW / Math.max(data.length - 1, 1);

  const pointsArr = data.map(
    (d, i) => `${i * stepX},${innerH - (d.y / maxY) * innerH}`
  );
  const points = pointsArr.join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Line chart"
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* subtle grid */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0}
            x2={innerW}
            y1={innerH * t}
            y2={innerH * t}
            stroke="rgba(255,255,255,0.03)"
          />
        ))}

        <polyline
          fill="rgba(100,255,218,0.08)"
          stroke="#64ffda"
          strokeWidth={2}
          points={points}
        />
        <polygon
          points={`${pointsArr.join(" ")} ${innerW},${innerH} 0,${innerH}`}
          fill="rgba(100,255,218,0.06)"
        />
        {data.map((d, i) => {
          const cx = i * stepX;
          const cy = innerH - (d.y / maxY) * innerH;
          return <circle key={d.x} cx={cx} cy={cy} r={4} fill="#64ffda" />;
        })}
      </g>
    </svg>
  );
}
