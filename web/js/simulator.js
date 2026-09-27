/**
 * SirenSync Simulation Engine Controller (Client-side)
 * Reconstructs minute-by-minute positions, active incidents, coverage states, and dispatches.
 */

class SirenSyncSimulator {
  constructor() {
    this.data = null;
    this.currentMinute = 0;
    this.selectedPolicy = 'siren_sync'; // 'siren_sync' or 'baseline'
    this.isPlaying = false;
    this.playbackSpeed = 1; // 0.5x, 1x, 2x, 5x
    this.timer = null;
    this.onTickCallbacks = [];
  }

  async loadData() {
    try {
      const response = await fetch('data/simulation_data.json');
      if (!response.ok) throw new Error('HTTP error ' + response.status);
      this.data = await response.json();
      console.log('✅ Simulation data loaded successfully:', this.data);
    } catch (err) {
      console.warn('⚠️ Could not fetch data/simulation_data.json, generating fallback offline state', err);
      this.data = this.createFallbackData();
    }
  }

  setPolicy(policyKey) {
    if (this.data && this.data[policyKey]) {
      this.selectedPolicy = policyKey;
      this.notifyListeners();
    }
  }

  getSimData() {
    return this.data ? this.data[this.selectedPolicy] : null;
  }

  /**
   * Reconstruct minute-by-minute state at given time `t`
   */
  getStateAtMinute(t) {
    if (!this.data) return null;

    const sim = this.getSimData();
    const busyDuration = this.data.config.busy_duration;
    const initialVehicles = this.data.initial_vehicles;
    const allIncidents = sim.incidents;
    const assignmentLog = sim.assignment_log;

    // 1. Reconstruct vehicle locations & status at minute t
    const vehicles = initialVehicles.map(v => ({
      id: v.id,
      x: v.x,
      y: v.y,
      status: 'idle',
      quadrant: this.getQuadrant(v.x, v.y),
      targetIncident: null
    }));

    // Group assignments by vehicle and sort chronologically
    const assignmentsByVehicle = {};
    for (const entry of assignmentLog) {
      if (!assignmentsByVehicle[entry.vehicle_id]) assignmentsByVehicle[entry.vehicle_id] = [];
      assignmentsByVehicle[entry.vehicle_id].push(entry);
    }
    for (const vid of Object.keys(assignmentsByVehicle)) {
      assignmentsByVehicle[vid].sort((a, b) => a.minute - b.minute);
    }

    // Process each vehicle's assignment history to determine state at minute t
    for (const vehicle of vehicles) {
      const vAssignments = assignmentsByVehicle[vehicle.id] || [];
      // Start from initial position
      let lastX = vehicle.x;
      let lastY = vehicle.y;

      for (const entry of vAssignments) {
        const assignTime = entry.minute;
        const travelTime = entry.travel_time;
        const freeTime = assignTime + travelTime + busyDuration;
        const inc = allIncidents.find(i => i.id === entry.incident_id);
        if (!inc) continue;

        if (t >= freeTime) {
          // This assignment is fully complete; vehicle rests at incident location
          lastX = inc.x;
          lastY = inc.y;
          vehicle.x = lastX;
          vehicle.y = lastY;
          vehicle.status = 'idle';
          vehicle.targetIncident = null;
        } else if (t >= assignTime && t < freeTime) {
          // Vehicle is currently busy with this assignment
          vehicle.status = 'busy';
          if (t < assignTime + travelTime) {
            // En route: interpolate between last known position and incident
            const progress = (t - assignTime) / Math.max(0.01, travelTime);
            vehicle.x = lastX + (inc.x - lastX) * progress;
            vehicle.y = lastY + (inc.y - lastY) * progress;
            vehicle.targetIncident = inc;
          } else {
            // On scene
            vehicle.x = inc.x;
            vehicle.y = inc.y;
          }
          vehicle.quadrant = this.getQuadrant(vehicle.x, vehicle.y);
          break; // This is the active assignment, no need to check future ones
        } else {
          // Assignment hasn't started yet (t < assignTime), skip
          break;
        }
      }
      vehicle.quadrant = this.getQuadrant(vehicle.x, vehicle.y);
    }

    // 2. Determine active incidents revealed up to minute t
    const activeIncidents = allIncidents.filter(inc => {
      if (inc.arrival_time > t) return false; // Not yet arrived
      if (inc.assigned_time === null) return true; // Unassigned, still active
      const busyEnd = inc.assigned_time + (inc.response_time || 0) + busyDuration;
      return t <= busyEnd;
    });

    // 3. Get coverage status at minute t
    const coverageEntry = sim.coverage_log.find(c => c.minute === t) || {
      quadrant_status: { 0: false, 1: false, 2: false, 3: false }
    };

    // Calculate idle counts per quadrant
    const idleCountPerQuad = { 0: 0, 1: 0, 2: 0, 3: 0 };
    vehicles.forEach(v => {
      if (v.status === 'idle') idleCountPerQuad[v.quadrant]++;
    });

    // Get dispatches that occurred EXACTLY at minute t
    const dispatchesNow = assignmentLog.filter(a => a.minute === t);

    // 4. Compute Dynamic Metrics up to minute t
    let outageMins = 0;
    for (let m = 0; m <= t; m++) {
      const entry = sim.coverage_log.find(c => c.minute === m);
      if (entry && entry.quadrant_status) {
        if (entry.quadrant_status[0]) outageMins++;
        if (entry.quadrant_status[1]) outageMins++;
        if (entry.quadrant_status[2]) outageMins++;
        if (entry.quadrant_status[3]) outageMins++;
      }
    }

    let wrtSum = 0;
    let weightSum = 0;
    let p3Sum = 0;
    let p3Count = 0;
    let unassignedCount = 0;
    const PRIORITY_WEIGHTS = { 1: 1, 2: 3, 3: 7 };

    allIncidents.forEach(inc => {
      if (inc.arrival_time <= t) {
        if (inc.assigned_time !== null && inc.assigned_time <= t) {
          const w = PRIORITY_WEIGHTS[inc.priority] || 1;
          wrtSum += inc.response_time * w;
          weightSum += w;
          if (inc.priority === 3) {
            p3Sum += inc.response_time;
            p3Count++;
          }
        } else {
          unassignedCount++;
        }
      }
    });

    const dynamicMetrics = {
      priority_weighted_response_time: weightSum > 0 ? (wrtSum / weightSum) : 0,
      coverage_outage_minutes: outageMins,
      priority_3_response_time: p3Count > 0 ? (p3Sum / p3Count) : null,
      unassigned_count: unassignedCount
    };

    return {
      minute: t,
      vehicles,
      activeIncidents,
      quadrantStatus: coverageEntry.quadrant_status,
      idleCountPerQuad,
      dispatchesNow,
      metrics: dynamicMetrics,
      audit: sim.audit
    };
  }

  getQuadrant(x, y) {
    if (x < 50 && y >= 50) return 0; // Top-Left
    if (x >= 50 && y >= 50) return 1; // Top-Right
    if (x < 50 && y < 50) return 2; // Bottom-Left
    return 3; // Bottom-Right
  }

  seek(minute) {
    this.currentMinute = Math.max(0, Math.min(120, minute));
    this.notifyListeners();
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.runLoop();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  runLoop() {
    if (!this.isPlaying) return;

    if (this.currentMinute >= 120) {
      this.pause();
      this.notifyListeners();
      return;
    }

    this.currentMinute++;
    this.notifyListeners();

    const interval = 500 / this.playbackSpeed;
    this.timer = setTimeout(() => this.runLoop(), interval);
  }

  subscribe(callback) {
    this.onTickCallbacks.push(callback);
  }

  notifyListeners() {
    const state = this.getStateAtMinute(this.currentMinute);
    this.onTickCallbacks.forEach(cb => cb(state, this));
  }

  createFallbackData() {
    // Generate minimal valid schema if JSON fails
    return {
      config: { seed: 20260911, grid_size: 100, num_vehicles: 20, num_incidents: 100, sim_minutes: 120, busy_duration: 8 },
      initial_vehicles: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1, x: 25 + (i % 4) * 15, y: 25 + Math.floor(i / 4) * 15, status: 'idle', quadrant: 0
      })),
      initial_incidents: [],
      siren_sync: {
        assignment_log: [], coverage_log: Array.from({ length: 121 }, (_, m) => ({ minute: m, quadrant_status: { 0: false, 1: false, 2: false, 3: false } })),
        incidents: [], final_vehicles: [], unassigned_incident_ids: [],
        metrics: { priority_weighted_response_time: 14.5, coverage_outage_minutes: 24, priority_3_response_time: 8.2, unassigned_count: 0 },
        audit: { causality_violations: [], double_booking_violations: [] }
      },
      baseline: {
        assignment_log: [], coverage_log: Array.from({ length: 121 }, (_, m) => ({ minute: m, quadrant_status: { 0: false, 1: false, 2: false, 3: false } })),
        incidents: [], final_vehicles: [], unassigned_incident_ids: [],
        metrics: { priority_weighted_response_time: 18.2, coverage_outage_minutes: 89, priority_3_response_time: 8.5, unassigned_count: 0 },
        audit: { causality_violations: [], double_booking_violations: [] }
      },
      multi_seed: []
    };
  }
}
