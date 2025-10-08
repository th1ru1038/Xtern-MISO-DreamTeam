import React from "react";
import "./App.css";
import "./Dashboard.css";
import BarChart from "./components/BarChart";
import LineChart from "./components/LineChart";
import ScatterPlot from "./components/ScatterPlot";
import DetailPanel from "./components/DetailPanel";
import { peopleVector, moneyVector, paperVector, momentumScores } from "./data";

function App() {
  const moneyData = moneyVector.map((m) => ({
    label: m.category,
    value: m.value,
  }));
  const momentumData = momentumScores.map((m) => ({ x: m.date, y: m.score }));

  const peoplePoints = React.useMemo(
    () => peopleVector.map((p) => ({ label: p.name, vector: p.v })),
    []
  );
  const [selected, setSelected] = React.useState<number | null>(null);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>MISO - Vectors Dashboard</h1>
      </header>
      <main className="dash-grid">
        <div className="dash-main">
          <section className="card">
            <h2>Money Vector</h2>
            <BarChart data={moneyData} />
          </section>

          <section className="card">
            <h2>Momentum Scores</h2>
            <LineChart data={momentumData} />
          </section>

          <section className="card">
            <h2>People Vector (2D projection)</h2>
            <ScatterPlot
              items={peoplePoints}
              onSelect={(i) => setSelected(i)}
              selectedIndex={selected}
            />
          </section>

          <section className="card">
            <h2>Paper Vector Scores</h2>
            <BarChart
              data={paperVector.map((p) => ({
                label: p.title,
                value: Math.round(p.score * 100),
              }))}
            />
          </section>
        </div>

        <aside className="dash-aside">
          <DetailPanel items={peoplePoints} selectedIndex={selected} />
        </aside>
      </main>
      <footer className="dash-footer"></footer>
    </div>
  );
}

export default App;
