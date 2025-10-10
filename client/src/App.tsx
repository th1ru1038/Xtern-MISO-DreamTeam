import React, { useEffect, useState } from "react";
import "./App.css";
import "./Dashboard.css";
import BarChart from "./components/BarChart";
import JobListView from "./components/JobListView";
import DetailPanel from "./components/DetailPanel";
import MoneyVectorDisplay from "./components/MoneyVectorDisplay";
import {
  peopleVector,
  moneyVector,
  topRecipients,
  energyKeywords,
  loadAllVectorData,
} from "./data";

function App() {
  const [realData, setRealData] = useState<{
    peopleVector?: any[];
    moneyVector?: any[];
    momentumScores?: any[];
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadAllVectorData();
        setRealData(data);
      } catch (error) {
        console.error("Failed to load real data:", error);
      }
    };

    setTimeout(loadData, 1000);
  }, []);

  const currentPeopleVector = realData?.peopleVector || peopleVector;
  const currentMoneyVector = realData?.moneyVector || moneyVector;

  const peoplePoints = React.useMemo(
    () =>
      currentPeopleVector.map((p: any) => ({
        label: p.name,
        vector: p.v,
        relevance: p.relevance || 0,
        location: p.location || "",
        keywords: p.keywords || [],
      })),
    [currentPeopleVector]
  );

  const recipientData = topRecipients.slice(0, 5).map((r) => ({
    label: r.name.split(" ").slice(0, 3).join(" "),
    value: Math.round(r.amount / 1000000), //
  }));

  const sortedKeywords = [...energyKeywords].sort(
    (a, b) => b.momentum - a.momentum
  );
  const keywordData = sortedKeywords.slice(0, 6).map((k) => ({
    label: k.keyword.toUpperCase(),
    value: Math.round(k.momentum * 100),
  }));

  const [selected, setSelected] = React.useState<number | null>(null);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>MISO - Policy Momentum Dashboard</h1>
        <p>Real-time analysis of Energy Sector Activity</p>
      </header>
      <main className="dash-layout">
        <section className="card money-section">
          <h2>Money Vector - Financial Activity</h2>
          <p>Federal lobbying, awards, and state activity analysis</p>
          <MoneyVectorDisplay data={currentMoneyVector} />
        </section>

        <section className="card people-section">
          <h2>People Vector - Job Market Activity</h2>
          <p>Energy sector job postings sorted by relevance</p>
          <JobListView
            items={peoplePoints}
            onSelect={(i: number) => setSelected(i)}
            selectedIndex={selected}
          />
        </section>

        <aside className="detail-section">
          <DetailPanel items={peoplePoints} selectedIndex={selected} />
        </aside>

        <section className="card keywords-section">
          <h2>Energy Keyword Activity</h2>
          <p>Job posting frequency by energy sector keywords</p>
          <BarChart data={keywordData} />
          <div className="keyword-stats">
            <span>
              Top Keyword:{" "}
              <strong>{sortedKeywords[0]?.keyword.toUpperCase()}</strong>
            </span>
            <span>
              Coverage:{" "}
              <strong>{energyKeywords.length} keywords tracked</strong>
            </span>
          </div>
        </section>

        <section className="card recipients-section">
          <h2>Top Federal Recipients (2025)</h2>
          <p>Major federal award recipients in millions</p>
          <BarChart data={recipientData} />
          <div className="recipient-note">
            Total awarded:{" "}
            <strong>
              $
              {(
                topRecipients
                  .slice(0, 5)
                  .reduce((sum, r) => sum + r.amount, 0) / 1e9
              ).toFixed(2)}
              B
            </strong>{" "}
            to top 5 recipients
          </div>
        </section>

        <div className="info-panel">
          <h3>Real-Time Intelligence</h3>
          <div className="intel-item">
            <span className="intel-label">Data Sources:</span>
            <span>USAJobs, Indeed, Federal Awards, Lobbying Data</span>
          </div>
          <div className="intel-item">
            <span className="intel-label">Last Updated:</span>
            <span>October 9, 2025</span>
          </div>
          <div className="intel-item">
            <span className="intel-label">Vector Analysis:</span>
            <span>People + Money + Paper</span>
          </div>
        </div>
      </main>
      <footer className="dash-footer">
        <p>
          MISO Policy Momentum Intelligence System - Real data from completed
          vector analysis
        </p>
      </footer>
    </div>
  );
}

export default App;
