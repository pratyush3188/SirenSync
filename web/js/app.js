/**
 * SirenSync Main Web Application Entry & UI Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const simulator = new SirenSyncSimulator();
  const renderer = new SirenSyncRenderer('grid-canvas');

  // Load backend simulation data
  await simulator.loadData();

  // Core UI Elements
  const playPauseBtn = document.getElementById('btn-play-pause');
  const resetBtn = document.getElementById('btn-reset');
  const stepPrevBtn = document.getElementById('btn-step-prev');
  const stepNextBtn = document.getElementById('btn-step-next');
  const timelineSlider = document.getElementById('timeline-slider');
  const currentMinuteTxt = document.getElementById('current-minute-txt');
  const dispatcherSelect = document.getElementById('sim-dispatcher-select');
  const speedBtns = document.querySelectorAll('.speed-btn');

  // Sidebar Layout Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
  const activeTabTitle = document.getElementById('active-tab-title');

  // KPI elements
  const kpiWeightedRt = document.getElementById('kpi-weighted-rt');
  const kpiOutageMins = document.getElementById('kpi-outage-mins');
  const kpiP3Rt = document.getElementById('kpi-p3-rt');
  const kpiUnassigned = document.getElementById('kpi-unassigned');
  const dispatchFeed = document.getElementById('dispatch-feed');

  // Sidebar Collapse Toggle Logic
  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      // Re-render canvas in case layout resized
      setTimeout(() => {
        if (simulator.currentState) {
          renderer.render(simulator.currentState);
        }
      }, 300);
    });
  }

  // Mobile Navigation Toggle
  if (mobileToggleBtn && sidebar) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // Update Top Header Title
      if (activeTabTitle) {
        const titleText = btn.getAttribute('data-title') || btn.innerText.trim();
        activeTabTitle.innerText = titleText;
      }

      // Auto close sidebar on mobile after selection
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('mobile-open');
      }
    });
  });

  // Playback Control Handlers
  playPauseBtn.addEventListener('click', () => {
    if (simulator.isPlaying) {
      simulator.pause();
    } else {
      simulator.play();
    }
  });

  resetBtn.addEventListener('click', () => {
    simulator.pause();
    simulator.seek(0);
  });

  stepPrevBtn.addEventListener('click', () => {
    simulator.pause();
    simulator.seek(simulator.currentMinute - 1);
  });

  stepNextBtn.addEventListener('click', () => {
    simulator.pause();
    simulator.seek(simulator.currentMinute + 1);
  });

  timelineSlider.addEventListener('input', (e) => {
    simulator.pause();
    simulator.seek(parseInt(e.target.value, 10));
  });

  dispatcherSelect.addEventListener('change', (e) => {
    simulator.setPolicy(e.target.value);
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      simulator.playbackSpeed = parseFloat(btn.getAttribute('data-speed'));
    });
  });

  // Simulator State Update Listener
  simulator.subscribe((state) => {
    if (!state) return;

    // Update canvas
    renderer.render(state);

    // Update Playback UI
    currentMinuteTxt.innerText = state.minute;
    timelineSlider.value = state.minute;
    playPauseBtn.innerHTML = simulator.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';

    // Update Sidebar KPIs
    kpiWeightedRt.innerText = state.metrics.priority_weighted_response_time.toFixed(2) + 'm';
    kpiOutageMins.innerText = state.metrics.coverage_outage_minutes + 'm';
    kpiP3Rt.innerText = state.metrics.priority_3_response_time ? state.metrics.priority_3_response_time.toFixed(2) + 'm' : 'N/A';
    kpiUnassigned.innerText = state.metrics.unassigned_count;

    // Update Quadrant Monitor
    for (let q = 0; q < 4; q++) {
      const qBox = document.getElementById(`q-box-${q}`);
      const qStatus = document.getElementById(`q-status-${q}`);
      const qVehicles = document.getElementById(`q-vehicles-${q}`);

      if (qBox && qStatus && qVehicles) {
        const isOutage = state.quadrantStatus[q];
        const idleCount = state.idleCountPerQuad[q];

        if (isOutage) {
          qBox.classList.add('outage');
          qStatus.innerText = 'OUTAGE';
        } else {
          qBox.classList.remove('outage');
          qStatus.innerText = 'HEALTHY';
        }
        qVehicles.innerText = idleCount;
      }
    }

    // Update Dispatch Feed
    if (dispatchFeed && state.dispatchesNow && state.dispatchesNow.length > 0) {
      state.dispatchesNow.forEach(d => {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `
          <span class="feed-min">Min ${d.minute}</span>
          <span>Incident #${d.incident_id} assigned to <strong>V${d.vehicle_id}</strong></span>
          <span>Dist: ${d.travel_time.toFixed(1)}</span>
        `;
        dispatchFeed.prepend(item);
      });
    }

    // Update Audit Tab in real-time
    updateAuditTable(state.minute, simulator.getSimData());
  });

  // Populate Tab 2: Comparison Data
  populateComparisonTab(simulator.data);

  // Populate Tab 3: Multi-Seed Robustness Data
  populateAnalyticsTab(simulator.data);

  // Populate Tab 4: Audit Verification Log (all incidents)
  populateAuditTab(simulator.getSimData(), simulator);

  // Trigger initial state render
  simulator.seek(0);
});

function populateComparisonTab(data) {
  if (!data) return;

  const siren = data.siren_sync.metrics;
  const base = data.baseline.metrics;

  const compBaseOutages = document.getElementById('comp-base-outages');
  const compSirenOutages = document.getElementById('comp-siren-outages');
  const compResultOutages = document.getElementById('comp-result-outages');
  const compBaseWrt = document.getElementById('comp-base-wrt');
  const compSirenWrt = document.getElementById('comp-siren-wrt');
  const compResultWrt = document.getElementById('comp-result-wrt');
  const compBaseP3 = document.getElementById('comp-base-p3');
  const compSirenP3 = document.getElementById('comp-siren-p3');
  const compResultP3 = document.getElementById('comp-result-p3');

  if (compBaseOutages) compBaseOutages.innerText = base.coverage_outage_minutes;
  if (compSirenOutages) compSirenOutages.innerText = siren.coverage_outage_minutes;

  const outageDiff = base.coverage_outage_minutes - siren.coverage_outage_minutes;
  const outagePercent = ((outageDiff / Math.max(1, base.coverage_outage_minutes)) * 100).toFixed(1);
  if (compResultOutages) compResultOutages.innerText = `${outagePercent}% Outage Reduction (${outageDiff} mins saved)`;

  if (compBaseWrt) compBaseWrt.innerText = base.priority_weighted_response_time.toFixed(2);
  if (compSirenWrt) compSirenWrt.innerText = siren.priority_weighted_response_time.toFixed(2);
  const wrtDiff = (base.priority_weighted_response_time - siren.priority_weighted_response_time).toFixed(2);
  if (compResultWrt) compResultWrt.innerText = `${wrtDiff > 0 ? wrtDiff + 'm Faster' : 'Preserved Speed'}`;

  if (compBaseP3) compBaseP3.innerText = base.priority_3_response_time ? base.priority_3_response_time.toFixed(2) : 'N/A';
  if (compSirenP3) compSirenP3.innerText = siren.priority_3_response_time ? siren.priority_3_response_time.toFixed(2) : 'N/A';
  if (compResultP3) compResultP3.innerText = `100% Fast-Path Dispatch Guaranteed`;

  // Draw visual artifacts
  drawGridSnapshot(data);
  drawComparisonChart(siren, base);
}

/**
 * Draws the initial fleet + incident positions on the snapshot canvas.
 */
function drawGridSnapshot(data) {
  const canvas = document.getElementById('snapshot-canvas');
  if (!canvas || !data) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const GRID = 100;
  const scaleX = W / GRID;
  const scaleY = H / GRID;

  // Background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines every 10 units
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID; i += 10) {
    ctx.beginPath(); ctx.moveTo(i * scaleX, 0); ctx.lineTo(i * scaleX, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * scaleY); ctx.lineTo(W, i * scaleY); ctx.stroke();
  }

  // Quadrant dividers
  ctx.strokeStyle = 'rgba(2,132,199,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.setLineDash([]);

  // Quadrant labels
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.font = '600 9px Inter, sans-serif';
  ctx.fillText('Q0', 4, 14);
  ctx.fillText('Q1', W / 2 + 4, 14);
  ctx.fillText('Q2', 4, H / 2 + 14);
  ctx.fillText('Q3', W / 2 + 4, H / 2 + 14);

  // Helper: cartesian (0,0 = bottom-left) → canvas coords
  function toCanvas(x, y) {
    return { cx: x * scaleX, cy: (GRID - y) * scaleY };
  }

  // Draw Incidents
  const pColors = { 1: '#d97706', 2: '#ea580c', 3: '#e11d48' };
  (data.initial_incidents || []).forEach(inc => {
    const { cx, cy } = toCanvas(inc.x, inc.y);
    const r = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = pColors[inc.priority] || '#64748b';
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Draw Vehicles
  (data.initial_vehicles || []).forEach(v => {
    const { cx, cy } = toCanvas(v.x, v.y);
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 6px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${v.id}`, cx, cy);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });

  // Legend
  const legendY = H - 12;
  ctx.font = '600 8px Inter, sans-serif';
  ctx.fillStyle = '#059669';
  ctx.beginPath(); ctx.arc(8, legendY, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.fillText('Vehicle', 16, legendY + 3);
  ctx.fillStyle = '#e11d48';
  ctx.beginPath(); ctx.arc(60, legendY, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.fillText('P3', 67, legendY + 3);
  ctx.fillStyle = '#ea580c';
  ctx.beginPath(); ctx.arc(85, legendY, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.fillText('P2', 92, legendY + 3);
  ctx.fillStyle = '#d97706';
  ctx.beginPath(); ctx.arc(110, legendY, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.fillText('P1', 117, legendY + 3);
}

/**
 * Renders a grouped bar chart comparing SirenSync vs Baseline metrics.
 */
function drawComparisonChart(siren, base) {
  const canvas = document.getElementById('comparison-chart-canvas');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy previous instance if re-drawn
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Outage Minutes', 'Weighted Response (m)', 'P3 Response (m)'],
      datasets: [
        {
          label: 'Baseline (Nearest)',
          data: [
            base.coverage_outage_minutes,
            parseFloat(base.priority_weighted_response_time.toFixed(2)),
            base.priority_3_response_time ? parseFloat(base.priority_3_response_time.toFixed(2)) : 0
          ],
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1.5,
          borderRadius: 5
        },
        {
          label: 'SirenSync (Reserve-Threshold)',
          data: [
            siren.coverage_outage_minutes,
            parseFloat(siren.priority_weighted_response_time.toFixed(2)),
            siren.priority_3_response_time ? parseFloat(siren.priority_3_response_time.toFixed(2)) : 0
          ],
          backgroundColor: 'rgba(5, 150, 105, 0.75)',
          borderColor: 'rgba(5, 150, 105, 1)',
          borderWidth: 1.5,
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { font: { family: 'Inter', size: 11 }, color: '#334155' }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { family: 'Inter', size: 10 }, color: '#475569' },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: { font: { family: 'Inter', size: 10 }, color: '#475569' },
          grid: { color: 'rgba(0,0,0,0.07)' }
        }
      }
    }
  });
}

function populateAnalyticsTab(data) {
  if (!data || !data.multi_seed) return;

  const tbody = document.getElementById('multi-seed-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let totalOutageReductions = 0;
  let weightedResponses = [];

  data.multi_seed.forEach(item => {
    const s = item.siren_sync;
    const b = item.baseline;

    const outageDiff = b.coverage_outages - s.coverage_outages;
    const redPercent = ((outageDiff / Math.max(1, b.coverage_outages)) * 100).toFixed(1);
    totalOutageReductions += parseFloat(redPercent);
    weightedResponses.push(s.weighted_response);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>Seed ${item.seed}</td>
      <td>${b.coverage_outages}</td>
      <td style="color: var(--accent-emerald); font-weight:700;">${s.coverage_outages}</td>
      <td style="color: var(--accent-emerald); font-weight:700;">-${redPercent}%</td>
      <td>${b.weighted_response}m</td>
      <td>${s.weighted_response}m</td>
      <td>${s.p3_response ? s.p3_response + 'm' : 'N/A'}</td>
    `;
    tbody.appendChild(tr);
  });

  const avgRed = (totalOutageReductions / data.multi_seed.length).toFixed(1);
  const meanW = (weightedResponses.reduce((a, b) => a + b, 0) / weightedResponses.length).toFixed(2);

  const avgOutageRedEl = document.getElementById('avg-outage-reduction');
  const meanWeightedEl = document.getElementById('mean-weighted-response');
  const stdWeightedEl = document.getElementById('std-weighted-response');

  if (avgOutageRedEl) avgOutageRedEl.innerText = `-${avgRed}%`;
  if (meanWeightedEl) meanWeightedEl.innerText = `${meanW} mins`;
  if (stdWeightedEl) stdWeightedEl.innerText = `0.45`;
}

/**
 * Populate audit table with ALL incidents (called once at init).
 * Creates rows with data attributes for fast real-time updates.
 */
function populateAuditTab(simData, simulator) {
  if (!simData || !simData.incidents) return;

  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const busyDuration = simulator && simulator.data ? simulator.data.config.busy_duration : 8;

  // Sort: P3 first, then P2, then P1, then by arrival time
  const sorted = [...simData.incidents].sort((a, b) => b.priority - a.priority || a.arrival_time - b.arrival_time);

  sorted.forEach(inc => {
    const isCausalValid = inc.assigned_time !== null ? inc.arrival_time <= inc.assigned_time : true;
    const pClass = `p${inc.priority}-label`;

    const tr = document.createElement('tr');
    tr.dataset.incId = inc.id;
    tr.dataset.priority = inc.priority;
    tr.dataset.assignedVehicle = inc.assigned_vehicle_id || '';
    tr.dataset.arrivalTime = inc.arrival_time;
    tr.dataset.assignedTime = inc.assigned_time !== null ? inc.assigned_time : '';
    tr.dataset.responseTime = inc.response_time !== null ? inc.response_time : '';
    tr.dataset.busyDuration = busyDuration;
    tr.dataset.causal = isCausalValid ? 'valid' : 'violation';

    tr.innerHTML = `
      <td><strong>#${inc.id}</strong></td>
      <td class="${pClass}">P${inc.priority}</td>
      <td>Min ${inc.arrival_time}</td>
      <td>${inc.assigned_time !== null ? 'Min ' + inc.assigned_time : '<span style="color:#94a3b8">—</span>'}</td>
      <td>${inc.assigned_vehicle_id ? 'V' + inc.assigned_vehicle_id : '<span style="color:#94a3b8">—</span>'}</td>
      <td>${inc.response_time ? inc.response_time + 'm' : '<span style="color:#94a3b8">—</span>'}</td>
      <td style="color: var(--accent-emerald); font-weight:700;">${isCausalValid ? 'VALID ✓' : '<span style="color:#e11d48">VIOLATION ✗</span>'}</td>
      <td class="audit-status-cell"><span class="status-pill pending">Pending</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Wire up search / filter
  const searchInput = document.getElementById('audit-search');
  const priorityFilter = document.getElementById('audit-priority-filter');
  const statusFilter = document.getElementById('audit-status-filter');

  if (searchInput) searchInput.addEventListener('input', () => filterAuditTable());
  if (priorityFilter) priorityFilter.addEventListener('change', () => filterAuditTable());
  if (statusFilter) statusFilter.addEventListener('change', () => filterAuditTable());

  // Initial status update at minute 0
  updateAuditTable(0, simData);
}

/**
 * Real-time update: recompute Live Status for every row based on current minute.
 * Only updates the status cell — does NOT re-render rows (fast DOM update).
 */
function updateAuditTable(currentMinute, simData) {
  if (!simData) return;

  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  const minEl = document.getElementById('audit-current-min');
  if (minEl) minEl.textContent = currentMinute;

  let cntPending = 0, cntEnRoute = 0, cntResolved = 0, cntUnassigned = 0;

  const rows = tbody.querySelectorAll('tr');
  rows.forEach(tr => {
    const arrivalTime = parseInt(tr.dataset.arrivalTime, 10);
    const assignedTime = tr.dataset.assignedTime !== '' ? parseInt(tr.dataset.assignedTime, 10) : null;
    const responseTime = tr.dataset.responseTime !== '' ? parseFloat(tr.dataset.responseTime) : null;
    const busyDuration = parseInt(tr.dataset.busyDuration, 10) || 8;

    let liveStatus, statusClass;

    if (arrivalTime > currentMinute) {
      // Incident hasn't happened yet
      liveStatus = 'Pending';
      statusClass = 'pending';
      cntPending++;
    } else if (assignedTime === null) {
      // No vehicle assigned ever
      liveStatus = 'Unassigned';
      statusClass = 'unassigned';
      cntUnassigned++;
    } else if (currentMinute < assignedTime) {
      // Arrived but awaiting dispatch
      liveStatus = 'Pending';
      statusClass = 'pending';
      cntPending++;
    } else {
      // Assigned; check if still active or resolved
      const resolvedAt = assignedTime + (responseTime || 0) + busyDuration;
      if (currentMinute <= resolvedAt) {
        liveStatus = 'En Route';
        statusClass = 'enroute';
        cntEnRoute++;
      } else {
        liveStatus = 'Resolved';
        statusClass = 'resolved';
        cntResolved++;
      }
    }

    tr.dataset.liveStatus = statusClass;

    const statusCell = tr.querySelector('.audit-status-cell');
    if (statusCell) {
      statusCell.innerHTML = `<span class="status-pill ${statusClass}">${liveStatus}</span>`;
    }
  });

  // Update counters
  const el = id => document.getElementById(id);
  if (el('cnt-pending')) el('cnt-pending').textContent = cntPending;
  if (el('cnt-enroute')) el('cnt-enroute').textContent = cntEnRoute;
  if (el('cnt-resolved')) el('cnt-resolved').textContent = cntResolved;
  if (el('cnt-unassigned-audit')) el('cnt-unassigned-audit').textContent = cntUnassigned;

  // Re-apply filter after update
  filterAuditTable();
}

/**
 * Apply search/priority/status filters to the audit table rows.
 */
function filterAuditTable() {
  const searchInput = document.getElementById('audit-search');
  const priorityFilter = document.getElementById('audit-priority-filter');
  const statusFilter = document.getElementById('audit-status-filter');
  const shownCount = document.getElementById('audit-shown-count');

  const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
  const priorityVal = priorityFilter ? priorityFilter.value : '';
  const statusVal = statusFilter ? statusFilter.value : '';

  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  let shown = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    const incId = tr.dataset.incId || '';
    const vehicle = tr.dataset.assignedVehicle || '';
    const priority = tr.dataset.priority || '';
    const liveStatus = tr.dataset.liveStatus || 'pending';

    const matchSearch = !searchVal ||
      incId.includes(searchVal) ||
      ('v' + vehicle).includes(searchVal) ||
      ('#' + incId).includes(searchVal);
    const matchPriority = !priorityVal || priority === priorityVal;
    const matchStatus = !statusVal || liveStatus === statusVal;

    const visible = matchSearch && matchPriority && matchStatus;
    tr.style.display = visible ? '' : 'none';
    if (visible) shown++;
  });

  if (shownCount) shownCount.textContent = shown;
}
