"use client";

import { type ReactNode, useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface GlassTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function GlassTabs({ tabs, defaultTab }: GlassTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div>
      <div className="flex gap-1 border-b border-border-glass mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
              ${
                activeTab === tab.id
                  ? "border-accent-blue text-accent-blue"
                  : "border-transparent text-text-muted hover:text-text-secondary hover:border-border-glass-hover"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{activeContent}</div>
    </div>
  );
}
