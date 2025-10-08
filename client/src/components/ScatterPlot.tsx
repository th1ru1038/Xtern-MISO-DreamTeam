import { useMemo, useState } from "react";
import { projectTo2D } from "../utils/pca";

type Item = { label: string; vector: number[] };

export default function ScatterPlot({
  items,
  width = 420,
  height = 240,
  onSelect,
  selectedIndex,
}: {
  items: Item[];
  width?: number;
  height?: number;
  onSelect?: (i: number) => void;
  selectedIndex?: number | null;
}) {
  const [hover, setHover] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const projected = useMemo(() => {
    const vecs = items.map((it) => it.vector);
    return projectTo2D(vecs);
  }, [items]);

  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const toX = (x: number) =>
    ((x - minX) / (maxX - minX || 1)) * (width - 40) + 20;
  const toY = (y: number) =>
    height - (((y - minY) / (maxY - minY || 1)) * (height - 40) + 20);

  return (
    <div style={{ position: "relative", width }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Scatter plot"
      >
        <g>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="rgba(255,255,255,0.01)"
            rx={8}
          />
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={`h${t}`}
              x1={20}
              x2={width - 20}
              y1={height * t}
              y2={height * t}
              stroke="rgba(255,255,255,0.02)"
            />
          ))}
        </g>

        {projected.map((p, idx) => {
          const cx = toX(p[0]);
          const cy = toY(p[1]);
          const label = items[idx].label;
          const isSelected = selectedIndex === idx;
          return (
            <g
              key={label}
              onMouseEnter={() => setHover({ label, x: cx, y: cy })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(idx)}
              style={{ cursor: "pointer" }}
            >
              {isSelected && (
                <circle cx={cx} cy={cy} r={14} fill="rgba(255,123,123,0.12)" />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 8 : 5}
                fill={isSelected ? "#ff7b7b" : "#ffd18a"}
                stroke="rgba(0,0,0,0.08)"
              />
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="tooltip"
          style={{
            left: Math.min(width - 80, hover.x + 8),
            top: Math.max(8, hover.y - 30),
          }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}
