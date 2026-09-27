import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useSimulator } from './hooks/useSimulator';
import CommandCenter from './components/CommandCenter/CommandCenter';
import ComparisonTab from './components/ComparisonTab';
import AnalyticsTab from './components/AnalyticsTab';
import AuditTab from './components/AuditTab';

const App = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('command-center');
  const simulator = useSimulator();

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'command-center': return 'Live Grid Simulator';
      case 'comparison': return 'Dispatcher Comparison';
      case 'analytics': return 'Multi-Seed Robustness Evaluation';
      case 'audit': return 'Causality & Compliance Audit';
      default: return 'Live Grid Simulator';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800 font-sans relative before:content-[''] before:absolute before:top-0 before:left-[-20%] before:w-[140%] before:h-full before:-z-10 before:bg-[radial-gradient(ellipse_at_top,_#e0f2fe_0%,_#f8fafc_60%)]">
      
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleSidebar={() => setIsCollapsed(!isCollapsed)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar activeTabTitle={getActiveTabTitle()} />
        
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {activeTab === 'command-center' && <CommandCenter simulator={simulator} />}
          {activeTab === 'comparison' && <ComparisonTab data={simulator.data} />}
          {activeTab === 'analytics' && <AnalyticsTab data={simulator.data} />}
          {activeTab === 'audit' && <AuditTab data={simulator.data} />}
        </main>
        
        <footer className="py-4 text-center text-[0.8rem] text-text-muted border-t border-glass-border mt-auto">
          <p>SirenSync &copy; 2026 — AI-01 Emergency Fleet Assignment System. Premium Light Theme Edition.</p>
        </footer>
      </div>

    </div>
  );
};

export default App;
