import React, { useRef, useEffect } from 'react';

const SimulationCanvas = ({ simState }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!simState || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const gridSize = 100;
    const width = canvas.width;
    const height = canvas.height;
    const scale = width / gridSize;

    const colors = {
      bg: '#ffffff',
      gridLines: 'rgba(0, 0, 0, 0.05)',
      axisLines: 'rgba(2, 132, 199, 0.4)',
      qText: 'rgba(0, 0, 0, 0.4)',
      outageFill: 'rgba(225, 29, 72, 0.1)',
      outageBorder: 'rgba(225, 29, 72, 0.5)',
      vehicleIdle: '#059669',
      vehicleBusy: '#94a3b8',
      p1: '#d97706',
      p2: '#ea580c',
      p3: '#e11d48'
    };

    const toCanvasCoords = (x, y) => ({
      cx: x * scale,
      cy: (gridSize - y) * scale
    });

    const drawOutageBox = (x, y, w, h) => {
      ctx.fillStyle = colors.outageFill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = colors.outageBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    };

    // Render loop
    ctx.clearRect(0, 0, width, height);
    
    // Grid & Quads
    const half = width / 2;
    if (simState.quadrantStatus) {
      if (simState.quadrantStatus[0]) drawOutageBox(0, 0, half, half);
      if (simState.quadrantStatus[1]) drawOutageBox(half, 0, half, half);
      if (simState.quadrantStatus[2]) drawOutageBox(0, half, half, half);
      if (simState.quadrantStatus[3]) drawOutageBox(half, half, half, half);
    }

    ctx.strokeStyle = colors.gridLines;
    ctx.lineWidth = 1;
    for (let i = 0; i <= width; i += scale * 10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    ctx.strokeStyle = colors.axisLines;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(half, 0); ctx.lineTo(half, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, half); ctx.lineTo(width, half); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = colors.qText;
    ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.fillText('QUADRANT 0 (TL)', 15, 25);
    ctx.fillText('QUADRANT 1 (TR)', half + 15, 25);
    ctx.fillText('QUADRANT 2 (BL)', 15, half + 25);
    ctx.fillText('QUADRANT 3 (BR)', half + 15, half + 25);

    // Incidents
    simState.activeIncidents.forEach(inc => {
      const { cx, cy } = toCanvasCoords(inc.x, inc.y);
      const size = 12;
      ctx.save();
      if (inc.priority === 3) {
        ctx.beginPath(); ctx.arc(cx, cy, size + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.3)'; ctx.fill();
        ctx.strokeStyle = colors.p3; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - size, cy - size); ctx.lineTo(cx + size, cy + size);
        ctx.moveTo(cx + size, cy - size); ctx.lineTo(cx - size, cy + size); ctx.stroke();
      } else if (inc.priority === 2) {
        ctx.fillStyle = colors.p2; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy + size); ctx.lineTo(cx - size, cy + size); ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = colors.p1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy); ctx.lineTo(cx, cy + size); ctx.lineTo(cx - size, cy); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#f8fafc'; ctx.font = '600 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(`P${inc.priority} #${inc.id}`, cx, cy - size - 4);
      ctx.restore();
    });

    // Dispatch Lines
    simState.vehicles.forEach(v => {
      if (v.status === 'busy' && v.targetIncident) {
        const vPos = toCanvasCoords(v.x, v.y);
        const iPos = toCanvasCoords(v.targetIncident.x, v.targetIncident.y);
        ctx.save();
        ctx.strokeStyle = v.targetIncident.priority === 3 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(vPos.cx, vPos.cy); ctx.lineTo(iPos.cx, iPos.cy); ctx.stroke();
        ctx.restore();
      }
    });

    // Vehicles
    simState.vehicles.forEach(v => {
      const { cx, cy } = toCanvasCoords(v.x, v.y);
      const radius = 10;
      const isIdle = v.status === 'idle';
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = isIdle ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isIdle ? colors.vehicleIdle : colors.vehicleBusy; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = '700 10px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`V${v.id}`, cx, cy);
      ctx.restore();
    });
  }, [simState]);

  return (
    <div className="relative w-full aspect-square bg-[#f8fafc] rounded-xl border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={600} 
        className="block w-full h-full"
      />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-white shadow-sm flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Vehicle Idle</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Vehicle Busy</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-600 rotate-45"></span> Priority 1</div>
        <div className="flex items-center gap-2"><span className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange-600"></span> Priority 2</div>
        <div className="flex items-center gap-2"><span className="text-rose-600 font-bold text-lg leading-none">×</span> Priority 3</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-rose-50 border border-rose-500"></span> Outage Zone</div>
      </div>
    </div>
  );
};

export default SimulationCanvas;
