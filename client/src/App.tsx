import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "./Dashboard.css";
import BarChart from "./components/BarChart";
import DetailPanel from "./components/DetailPanel";
import JobListView from "./components/JobListView";
import PeopleVectorSummary from "./components/PeopleVectorSummary";
import MoneyVectorDisplay from "./components/MoneyVectorDisplay";
import PaperVectorPanel from "./components/PaperVectorPanel";
import {
  energyKeywords,
  loadAllVectorData,
  moneyVector,
  peopleVector,
  topRecipients,
  paperVector as paperVectorSample,
} from "./data";
import type { VectorDataBundle } from "./data";
import type {
  MoneyVectorItem,
  PeopleVectorItem,
  TopRecipient as Recipient,
  PaperVectorData,
} from "./types/data";
import { computePeopleSignals } from "./utils/peopleInsights";

function App() {
  const [vectorData, setVectorData] = useState<VectorDataBundle | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await loadAllVectorData();
        if (isMounted) {
          setVectorData(data);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Failed to load real data:", error);
        if (isMounted) {
          setLoadError(error);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const isLoading = !vectorData && !loadError;

  const currentPeopleVector: PeopleVectorItem[] = useMemo(() => {
    if (vectorData) return vectorData.peopleVector;
    if (loadError) return peopleVector;
    return [];
  }, [vectorData, loadError]);

  const currentMoneyVector: MoneyVectorItem[] = useMemo(() => {
    if (vectorData) return vectorData.moneyVector;
    if (loadError) return moneyVector;
    return [];
  }, [vectorData, loadError]);

  const currentTopRecipients: Recipient[] = useMemo(() => {
    if (vectorData) return vectorData.topRecipients;
    if (loadError) return topRecipients;
    return [];
  }, [vectorData, loadError]);

  const fallbackPaperVector: PaperVectorData = useMemo(() => {
    const topics = paperVectorSample.map((item, index) => {
      const slug = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      return {
        title: item.title,
        topic: slug || `topic_${index}`,
        score: item.score,
        date: "",
        change30d: 0,
        frNotices: 0,
        commentRate14d: 0,
        underReview: 0,
        econSignificant: false,
        whiteHouseHits: 0,
        executiveOrderHits: 0,
      };
    });

    return {
      topics,
      trend: topics.map((topic, index) => ({
        date: `T${index + 1}`,
        score: topic.score,
      })),
    };
  }, []);

  const currentPaperVector: PaperVectorData = useMemo(() => {
    if (vectorData?.paperVector) {
      return vectorData.paperVector;
    }
    if (loadError) {
      return fallbackPaperVector;
    }
    return { topics: [], trend: [] };
  }, [vectorData, loadError, fallbackPaperVector]);

  const peoplePoints = useMemo(
    () =>
      currentPeopleVector.map((p) => ({
        label: p.name,
        vector: p.v,
        relevance: p.relevance ?? 0,
        location: p.location ?? "",
        keywords: p.keywords ?? [],
        postedAt: p.postedAt,
        source: p.source,
      })),
    [currentPeopleVector]
  );

  const peopleSummary = useMemo(
    () => computePeopleSignals(currentPeopleVector),
    [currentPeopleVector]
  );

  const sortedKeywords = useMemo(
    () => [...energyKeywords].sort((a, b) => b.momentum - a.momentum),
    []
  );

  const keywordData = useMemo(
    () =>
      sortedKeywords.slice(0, 6).map((k) => ({
        label: k.keyword.toUpperCase(),
        value: Math.round(k.momentum * 100),
      })),
    [sortedKeywords]
  );

  const recipientData = useMemo(
    () =>
      currentTopRecipients.slice(0, 5).map((r) => ({
        label: r.name.split(" ").slice(0, 3).join(" "),
        value: Math.round(r.amount / 1_000_000),
      })),
    [currentTopRecipients]
  );

  const totalTopFiveBillions = useMemo(() => {
    if (!currentTopRecipients.length) {
      return 0;
    }
    const total = currentTopRecipients
      .slice(0, 5)
      .reduce((sum, recipient) => sum + recipient.amount, 0);
    return total / 1_000_000_000;
  }, [currentTopRecipients]);

  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="dashboard">
        <header className="dash-header">
          <h1>MISO - Policy Momentum Dashboard</h1>
          <p>Real-time analysis of Energy Sector Activity</p>
        </header>
        <main className="dash-layout">
          <section className="card">
            <h2>Loading real-time intelligence…</h2>
            <p>Please wait while we fetch the latest vector data.</p>
          </section>
        </main>
        <footer className="dash-footer">
          <p>MISO Policy Momentum Intelligence System</p>
        </footer>
      </div>
    );
  }

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
          {loadError && (
            <p className="data-fallback">
              Live data unavailable, showing sample insights.
            </p>
          )}
        </section>

        <section className="card people-section">
          <h2>People Vector - Job Market Activity</h2>
          <p>Energy sector job postings sorted by relevance</p>
          <PeopleVectorSummary summary={peopleSummary} />
          <JobListView
            items={peoplePoints}
            onSelect={(index: number) => setSelected(index)}
            selectedIndex={selected}
          />
        </section>

        <aside className="detail-section">
          <DetailPanel items={peoplePoints} selectedIndex={selected} />
        </aside>

        <section className="card paper-section">
          <PaperVectorPanel
            data={currentPaperVector}
            isFallback={Boolean(loadError)}
          />
        </section>

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
            Total awarded: <strong>${totalTopFiveBillions.toFixed(2)}B</strong>{" "}
            to top 5 recipients
          </div>
          {loadError && (
            <p className="data-fallback">
              Live data unavailable, showing sample insights.
            </p>
          )}
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
        <p>MISO Policy Momentum Intelligence System</p>
      </footer>
    </div>
  );
}

export default App;
