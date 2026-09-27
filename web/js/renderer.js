/**
 * SirenSync High-Performance HTML5 Canvas Renderer
 * Renders the 100x100 spatial grid, 4 quadrants, vehicles, incidents, and dispatches.
 */

class SirenSyncRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.gridSize = 100;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.scale = this.width / this.gridSize; // 600 / 100 = 6 pixels per unit

    // Colors
    this.colors = {
      bg: '#ffffff',
      gridLines: 'rgba(0, 0, 0, 0.05)',
      axisLines: 'rgba(2, 132, 199, 0.4)', // sky-600 with opacity
      qText: 'rgba(0, 0, 0, 0.4)',
      outageFill: 'rgba(225, 29, 72, 0.1)',
      outageBorder: 'rgba(225, 29, 72, 0.5)',
      
      vehicleIdle: '#059669', // emerald-600
      vehicleBusy: '#94a3b8', // slate-400
      
      p1: '#d97706', // amber-600
      p2: '#ea580c', // orange-600
      p3: '#e11d48'  // rose-600
    };
  }

  render(state) {
    if (!state) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Sub-Grid & Quadrants
    this.drawGrid(state.quadrantStatus);

    // 2. Draw Active Incidents
    state.activeIncidents.forEach(inc => this.drawIncident(inc));

    // 3. Draw Dispatch Vectors (lines connecting vehicle to target incident)
    state.vehicles.forEach(v => {
      if (v.status === 'busy' && v.targetIncident) {
        this.drawDispatchLine(v, v.targetIncident);
      }
    });

    // 4. Draw Vehicles
    state.vehicles.forEach(v => this.drawVehicle(v));
  }

  drawGrid(quadrantStatus) {
    const half = this.width / 2;

    // Quadrant Outage Background Fills
    if (quadrantStatus) {
      // Q0: Top-Left (x: 0..50, y: 50..100 -> in canvas y: 0..half)
      if (quadrantStatus[0]) this.drawOutageBox(0, 0, half, half);
      // Q1: Top-Right (x: 50..100, y: 50..100 -> in canvas y: 0..half)
      if (quadrantStatus[1]) this.drawOutageBox(half, 0, half, half);
      // Q2: Bottom-Left (x: 0..50, y: 0..50 -> in canvas y: half..width)
      if (quadrantStatus[2]) this.drawOutageBox(0, half, half, half);
      // Q3: Bottom-Right (x: 50..100, y: 0..50 -> in canvas y: half..width)
      if (quadrantStatus[3]) this.drawOutageBox(half, half, half, half);
    }

    // Grid lines (every 10 units)
    this.ctx.strokeStyle = this.colors.gridLines;
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.width; i += this.scale * 10) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.width, i);
      this.ctx.stroke();
    }

    // Central Axis Lines (Quadrant Boundaries)
    this.ctx.strokeStyle = this.colors.axisLines;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);

    // Vertical line x=50
    this.ctx.beginPath();
    this.ctx.moveTo(half, 0);
    this.ctx.lineTo(half, this.height);
    this.ctx.stroke();

    // Horizontal line y=50
    this.ctx.beginPath();
    this.ctx.moveTo(0, half);
    this.ctx.lineTo(this.width, half);
    this.ctx.stroke();

    this.ctx.setLineDash([]); // Reset line dash

    // Quadrant Labels
    this.ctx.fillStyle = this.colors.qText;
    this.ctx.font = '700 14px "JetBrains Mono", monospace';
    this.ctx.fillText('QUADRANT 0 (TL)', 15, 25);
    this.ctx.fillText('QUADRANT 1 (TR)', half + 15, 25);
    this.ctx.fillText('QUADRANT 2 (BL)', 15, half + 25);
    this.ctx.fillText('QUADRANT 3 (BR)', half + 15, half + 25);
  }

  drawOutageBox(x, y, w, h) {
    this.ctx.fillStyle = this.colors.outageFill;
    this.ctx.fillRect(x, y, w, h);

    this.ctx.strokeStyle = this.colors.outageBorder;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  toCanvasCoords(x, y) {
    // Cartesian Grid (0,0 bottom-left, 100,100 top-right) -> Canvas coords (0,0 top-left)
    return {
      cx: x * this.scale,
      cy: (this.gridSize - y) * this.scale
    };
  }

  drawVehicle(v) {
    const { cx, cy } = this.toCanvasCoords(v.x, v.y);
    const radius = 10;
    const isIdle = v.status === 'idle';

    // Shadow / Outer Glow
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    this.ctx.fillStyle = isIdle ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)';
    this.ctx.fill();

    // Vehicle Circle Body
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = isIdle ? this.colors.vehicleIdle : this.colors.vehicleBusy;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Vehicle ID Text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '700 10px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`V${v.id}`, cx, cy);

    this.ctx.restore();
  }

  drawIncident(inc) {
    const { cx, cy } = this.toCanvasCoords(inc.x, inc.y);
    const size = 12;

    this.ctx.save();

    if (inc.priority === 3) {
      // Priority 3 Pulsing Emergency Radar Ring
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, size + 6, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(244, 63, 94, 0.3)';
      this.ctx.fill();

      // Red X Mark
      this.ctx.strokeStyle = this.colors.p3;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - size, cy - size);
      this.ctx.lineTo(cx + size, cy + size);
      this.ctx.moveTo(cx + size, cy - size);
      this.ctx.lineTo(cx - size, cy + size);
      this.ctx.stroke();
    } else if (inc.priority === 2) {
      // Priority 2 Orange Triangle
      this.ctx.fillStyle = this.colors.p2;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - size);
      this.ctx.lineTo(cx + size, cy + size);
      this.ctx.lineTo(cx - size, cy + size);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      // Priority 1 Yellow Diamond
      this.ctx.fillStyle = this.colors.p1;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - size);
      this.ctx.lineTo(cx + size, cy);
      this.ctx.lineTo(cx, cy + size);
      this.ctx.lineTo(cx - size, cy);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Incident ID Badge
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.font = '600 9px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`P${inc.priority} #${inc.id}`, cx, cy - size - 4);

    this.ctx.restore();
  }

  drawDispatchLine(v, inc) {
    const vPos = this.toCanvasCoords(v.x, v.y);
    const iPos = this.toCanvasCoords(inc.x, inc.y);

    this.ctx.save();
    this.ctx.strokeStyle = inc.priority === 3 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(56, 189, 248, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(vPos.cx, vPos.cy);
    this.ctx.lineTo(iPos.cx, iPos.cy);
    this.ctx.stroke();

    this.ctx.restore();
  }
}
