import React from 'react';

const TopBar = ({ activeTabTitle }) => {
  return (
    <header className="flex justify-between items-center px-8 py-5 border-b border-glass-border bg-[rgba(255,255,255,0.8)] backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile Toggle Button - Hidden on desktop in Tailwind */}
        <button id="mobile-toggle-btn" className="md:hidden bg-transparent border-none text-xl text-text-main cursor-pointer" title="Open Navigation">
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="flex flex-col">
          <h2 className="text-[1.35rem] font-bold text-text-main m-0 leading-[1.2]">{activeTabTitle}</h2>
          <span className="text-sm text-text-muted mt-1 font-medium">Real-time Coverage Preservation & Dispatch Operations</span>
        </div>
      </div>
      <div className="flex items-center">
        <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-mono text-[0.75rem] font-bold border border-slate-200 flex items-center gap-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
          <i className="fa-solid fa-microchip text-accent-blue"></i> Reserve-Threshold Policy v1.4
        </div>
      </div>
    </header>
  );
};

export default TopBar;
