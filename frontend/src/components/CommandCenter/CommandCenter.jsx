import React from 'react';
import SimulationCanvas from './SimulationCanvas';

const CommandCenter = ({ simulator }) => {
  const { 
    simState, currentMinute, selectedPolicy, setSelectedPolicy, 
    isPlaying, togglePlay, pause, seek, playbackSpeed, setPlaybackSpeed 
  } = simulator;

  if (!simState) return <div className="flex items-center justify-center h-full text-text-muted">Loading Simulation Data...</div>;

  const metrics = simState.metrics;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6 max-w-[1600px] mx-auto h-full">
      
      {/* Left Column - Canvas & Controls */}
      <div className="bg-glass-bg border border-glass-border rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] backdrop-blur-md flex flex-col h-full max-h-[85vh]">
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="font-bold text-text-main text-[1.05rem] flex items-center gap-2">
            <i className="fa-solid fa-earth-americas text-accent-blue text-lg"></i> 100x100 Grid Simulation Viewer
          </div>
          <div className="flex items-center gap-3 bg-[rgba(241,245,249,0.7)] p-1.5 px-3 rounded-xl border border-slate-200 shadow-sm">
            <label className="text-sm font-semibold text-text-muted">Policy:</label>
            <select 
              value={selectedPolicy} 
              onChange={(e) => setSelectedPolicy(e.target.value)}
              className="bg-transparent border-none text-text-main font-bold text-sm outline-none cursor-pointer pr-2 appearance-none"
            >
              <option value="siren_sync">🛡️ SirenSync (Reserve-Threshold)</option>
              <option value="baseline">⚡ Baseline (Naive Nearest)</option>
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex justify-center items-center">
          <SimulationCanvas simState={simState} />
        </div>

        {/* Playback Controls */}
        <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-6 shadow-sm">
          <div className="flex gap-2">
            <button onClick={() => seek(0)} className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all"><i className="fa-solid fa-rotate-left"></i></button>
            <button onClick={() => seek(currentMinute - 1)} className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all"><i className="fa-solid fa-backward-step"></i></button>
            <button onClick={togglePlay} className="w-12 h-12 rounded-xl bg-accent-blue text-white shadow-[0_4px_12px_rgba(14,165,233,0.3)] hover:scale-105 hover:-translate-y-0.5 flex items-center justify-center transition-all text-lg">
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </button>
            <button onClick={() => seek(currentMinute + 1)} className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all"><i className="fa-solid fa-forward-step"></i></button>
          </div>
          
          <div className="flex-1 flex flex-col gap-2 relative">
            <span className="absolute -top-6 left-0 text-xs font-bold text-slate-500 tracking-wider">Minute <strong className="text-accent-blue text-sm">{currentMinute}</strong> / 120</span>
            <input 
              type="range" 
              min="0" max="120" 
              value={currentMinute} 
              onChange={(e) => seek(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-blue"
            />
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[0.5, 1, 2, 5].map(speed => (
              <button 
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${playbackSpeed === speed ? 'bg-white shadow-sm text-text-main' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - KPIs & Quadrants */}
      <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-2">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-t-4 border-t-accent-blue rounded-xl p-4 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="absolute -right-3 -bottom-3 text-[4rem] text-accent-blue opacity-5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-clock"></i></div>
            <div className="text-3xl font-bold text-accent-blue mb-1">{metrics.priority_weighted_response_time.toFixed(2)}m</div>
            <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Weighted Response</div>
          </div>
          <div className="bg-white border-t-4 border-t-accent-crimson rounded-xl p-4 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="absolute -right-3 -bottom-3 text-[4rem] text-accent-crimson opacity-5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <div className="text-3xl font-bold text-accent-crimson mb-1">{metrics.coverage_outage_minutes}m</div>
            <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Outage Mins</div>
          </div>
          <div className="bg-white border-t-4 border-t-accent-emerald rounded-xl p-4 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="absolute -right-3 -bottom-3 text-[4rem] text-accent-emerald opacity-5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-truck-fast"></i></div>
            <div className="text-3xl font-bold text-accent-emerald mb-1">{metrics.priority_3_response_time ? metrics.priority_3_response_time.toFixed(2) + 'm' : 'N/A'}</div>
            <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Priority 3 RT</div>
          </div>
          <div className="bg-white border-t-4 border-t-accent-amber rounded-xl p-4 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="absolute -right-3 -bottom-3 text-[4rem] text-accent-amber opacity-5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-circle-question"></i></div>
            <div className="text-3xl font-bold text-accent-amber mb-1">{metrics.unassigned_count}</div>
            <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Unassigned</div>
          </div>
        </div>

        {/* Quadrants Monitor */}
        <div className="bg-glass-bg border border-glass-border rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.02)] backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-text-main flex items-center gap-2"><i className="fa-solid fa-border-all text-slate-400"></i> Quadrant Coverage Status</div>
            <span className="bg-[rgba(239,68,68,0.1)] text-red-600 border border-[rgba(239,68,68,0.2)] px-2 py-0.5 rounded-full text-[0.65rem] font-bold tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> LIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0,1,2,3].map(q => {
              const isOutage = simState.quadrantStatus[q];
              const title = ['Q0 (TL)', 'Q1 (TR)', 'Q2 (BL)', 'Q3 (BR)'][q];
              return (
                <div key={q} className={`p-4 rounded-xl border ${isOutage ? 'bg-[rgba(225,29,72,0.05)] border-[rgba(225,29,72,0.3)] shadow-[inset_0_0_20px_rgba(225,29,72,0.05)]' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-text-main">{title}</span>
                    {isOutage ? 
                      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[0.65rem] font-bold">OUTAGE</span> : 
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[0.65rem] font-bold border border-emerald-100">HEALTHY</span>
                    }
                  </div>
                  <div className="text-xs text-text-muted">Idle Vehicles: <strong className={isOutage ? 'text-rose-600' : 'text-text-main'}>{simState.idleCountPerQuad[q]}</strong></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dispatch Feed */}
        <div className="bg-glass-bg border border-glass-border rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.02)] backdrop-blur-md flex-1 flex flex-col min-h-[200px]">
          <div className="font-bold text-text-main mb-4 flex items-center gap-2"><i className="fa-solid fa-list-check text-slate-400"></i> Dispatch Feed</div>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
            {simState.dispatchesNow.length === 0 ? (
              <div className="text-sm text-text-muted italic text-center py-4">No dispatches this minute.</div>
            ) : (
              [...simState.dispatchesNow].reverse().map((d, i) => (
                <div key={i} className="bg-white border border-slate-100 p-3 rounded-lg text-sm flex items-center gap-3 shadow-sm animate-[slideIn_0.3s_ease-out]">
                  <span className="font-mono text-xs font-bold text-accent-blue bg-blue-50 px-2 py-1 rounded">Min {d.minute}</span>
                  <span className="flex-1 text-slate-600">Incident #{d.incident_id} assigned to <strong className="text-slate-800">V{d.vehicle_id}</strong></span>
                  <span className="text-xs text-slate-400 font-mono">Dist: {d.travel_time.toFixed(1)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default CommandCenter;
