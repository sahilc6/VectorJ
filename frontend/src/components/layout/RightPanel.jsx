import React from 'react';
import { useApp } from '../../contexts/AppContext';
import SearchTab from '../panels/SearchTab';
import DocsTab from '../panels/DocsTab';
import AskAITab from '../panels/AskAITab';

export default function RightPanel() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="right-panel">
      {/* Tabs */}
      <div className="tabs">
        {[
          { key: "search", label: "SEARCH" },
          { key: "docs", label: "DOCUMENTS" },
          { key: "rag", label: "ASK AI" },
        ].map((t) => (
          <div
            key={t.key}
            className={`tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "search" && <SearchTab />}
        {activeTab === "docs" && <DocsTab />}
        {activeTab === "rag" && <AskAITab />}
      </div>
    </div>
  );
}
