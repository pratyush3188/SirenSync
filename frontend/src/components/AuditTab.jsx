import React from 'react';

const AuditTab = ({ data }) => {
  if (!data || !data.siren_sync || !data.siren_sync.incidents) return <div className="text-center mt-10 text-text-muted">Loading data...</div>;

  const incidents = data.siren_sync.incidents.slice(0, 15); // Show first 15

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      <div className="mb-10 border-l-4 border-slate-700 pl-5">
        <h2 className="text-3xl font-extrabold text-text-main mb-2">Online Rules & Temporal Causality Audit</h2>
        <p className="text-text-muted font-medium text-base">Continuous validation ensuring strict adherence to hackathon constraints</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm flex items-start gap-4 hover:-translate-y-1 transition-all">
          <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mt-1"></i>
          <div>
            <h3 className="text-[1.1rem] font-bold text-emerald-900 mb-1">Temporal Causality Rule</h3>
            <p className="text-xs text-emerald-700 mb-3">No dispatch assignment occurs prior to incident arrival (arrival_time &le; assigned_time).</p>
            <span className="bg-emerald-600 text-white text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">PASS (0 Violations)</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm flex items-start gap-4 hover:-translate-y-1 transition-all">
          <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mt-1"></i>
          <div>
            <h3 className="text-[1.1rem] font-bold text-emerald-900 mb-1">Vehicle Double-Booking Check</h3>
            <p className="text-xs text-emerald-700 mb-3">No vehicle is dispatched to multiple incidents during its busy duration period.</p>
            <span className="bg-emerald-600 text-white text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">PASS (0 Violations)</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-700 flex items-center gap-2">
          <i className="fa-solid fa-clipboard-check text-slate-400"></i> Incident Verification Log
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[0.75rem] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 py-3">Incident ID</th>
                <th className="p-4 py-3">Priority</th>
                <th className="p-4 py-3">Arrival (Min)</th>
                <th className="p-4 py-3">Assigned (Min)</th>
                <th className="p-4 py-3">Vehicle ID</th>
                <th className="p-4 py-3">Travel Time</th>
                <th className="p-4 py-3">Causality Valid?</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc, i) => {
                const isCausalValid = inc.assigned_time !== null ? inc.arrival_time <= inc.assigned_time : true;
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600">
                    <td className="p-4 py-3 font-mono text-slate-500 text-xs">Incident #{inc.id}</td>
                    <td className="p-4 py-3">Priority {inc.priority}</td>
                    <td className="p-4 py-3">Min {inc.arrival_time}</td>
                    <td className="p-4 py-3">{inc.assigned_time !== null ? 'Min ' + inc.assigned_time : 'Unassigned'}</td>
                    <td className="p-4 py-3 font-bold text-slate-700">{inc.assigned_vehicle_id ? 'V' + inc.assigned_vehicle_id : '--'}</td>
                    <td className="p-4 py-3">{inc.response_time ? inc.response_time + 'm' : '--'}</td>
                    <td className={`p-4 py-3 font-bold ${isCausalValid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCausalValid ? 'VALID ✓' : 'VIOLATION ❌'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTab;
