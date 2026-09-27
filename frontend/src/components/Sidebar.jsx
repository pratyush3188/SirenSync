import React from 'react';

const Sidebar = ({ isCollapsed, toggleSidebar, activeTab, setActiveTab }) => {
  return (
    <aside className={`w-[260px] bg-glass-bg border-r border-glass-border backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out relative z-40 ${isCollapsed ? 'w-[80px]' : ''}`}>
      <div className="flex items-center justify-between mb-8 px-1 pt-6">
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src="/images/logo.png" 
            alt="SirenSync Logo" 
            className={`rounded-[14px] object-contain shadow-[0_4px_14px_rgba(2,132,199,0.15)] border-[1.5px] border-[rgba(2,132,199,0.18)] transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-[0_6px_20px_rgba(2,132,199,0.25)] ${isCollapsed ? 'w-[54px] min-w-[54px]' : 'w-[180px] min-w-[60px] h-auto'}`}
          />
        </div>
        <button 
          onClick={toggleSidebar}
          className="bg-[rgba(241,245,249,0.9)] border border-glass-border text-text-muted w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-slate-200 hover:text-text-main absolute right-[-16px] top-8 shadow-sm z-50"
          title="Toggle Sidebar"
        >
          <i className={`fa-solid fa-chevron-left transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}></i>
        </button>
      </div>

      <nav className="flex flex-col gap-2 flex-1 px-4 mt-8">
        {[
          { id: 'command-center', icon: 'fa-radar', label: 'Live Grid Simulator' },
          { id: 'comparison', icon: 'fa-scale-balanced', label: 'Dispatcher Comparison' },
          { id: 'analytics', icon: 'fa-chart-line', label: 'Multi-Seed Robustness' },
          { id: 'audit', icon: 'fa-shield-halved', label: 'Causality & Audit' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`bg-transparent border border-transparent flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer overflow-hidden
              ${activeTab === tab.id ? 'bg-white border-glass-border shadow-sm text-accent-blue font-bold' : 'text-text-muted hover:bg-[rgba(255,255,255,0.4)] hover:text-text-main'}
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
            title={tab.label}
          >
            <i className={`fa-solid ${tab.icon} w-6 text-center text-lg ${activeTab === tab.id ? 'text-accent-blue' : ''}`}></i>
            <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 px-4 pb-6">
        <div className={`bg-white border border-glass-border rounded-xl p-3 flex items-center gap-3 shadow-sm transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-accent-emerald shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0 animate-pulse"></div>
          <div className={`flex flex-col overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
            <span className="text-[0.65rem] font-bold text-accent-emerald tracking-wider uppercase mb-0.5">ONLINE CAUSAL ENGINE</span>
            <span className="text-xs text-text-muted font-mono bg-slate-50 px-1.5 py-0.5 rounded self-start border border-slate-200">Seed: 20260911</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
