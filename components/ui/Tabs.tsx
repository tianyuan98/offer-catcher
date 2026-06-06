"use client";

import { ReactNode } from "react";

interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
            {item.badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  active
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  active: boolean;
}

export function TabPanel({ children, active }: TabPanelProps) {
  if (!active) return null;
  return <div className="animate-in fade-in-0">{children}</div>;
}
