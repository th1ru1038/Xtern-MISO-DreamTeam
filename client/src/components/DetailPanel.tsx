import { topKSimilar } from "../utils/similarity";

export default function DetailPanel({
  items,
  selectedIndex,
}: {
  items: { label: string; vector: number[] }[];
  selectedIndex: number | null;
}) {
  if (selectedIndex === null)
    return <div className="card">Select a point to see details</div>;
  const item = items[selectedIndex];
  const top = topKSimilar(items, selectedIndex, 3);

  return (
    <div className="card">
      <header>
        <h3 style={{ margin: 0 }}>{item.label}</h3>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>Selected</div>
      </header>

      <div style={{ marginTop: 10 }}>
        <strong>Vector (first dims)</strong>
        <pre
          style={{
            margin: "6px 0",
            whiteSpace: "pre-wrap",
            background: "rgba(255,255,255,0.02)",
            padding: 8,
            borderRadius: 6,
          }}
        >
          {JSON.stringify(item.vector.slice(0, 6), null, 2)}
        </pre>
      </div>

      <div>
        <strong>Top similar</strong>
        <ul style={{ marginTop: 6 }}>
          {top.map((t) => (
            <li key={t.i} style={{ margin: "6px 0" }}>
              {t.label}{" "}
              <span style={{ color: "var(--muted)" }}>
                — {t.score.toFixed(3)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
