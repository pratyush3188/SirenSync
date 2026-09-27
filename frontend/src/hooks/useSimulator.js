import { useState, useEffect, useCallback, useRef } from 'react';

export const useSimulator = () => {
  const [data, setData] = useState(null);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [selectedPolicy, setSelectedPolicy] = useState('siren_sync');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [simState, setSimState] = useState(null);

  const timerRef = useRef(null);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/simulation_data.json');
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.warn('⚠️ Could not fetch data/simulation_data.json', err);
      }
    };
    fetchData();
  }, []);

  // Compute State at specific minute
  const getStateAtMinute = useCallback((t, policy, simData) => {
    if (!simData) return null;

    const sim = simData[policy];
    if (!sim) return null;

    const busyDuration = simData.config.busy_duration;
    const initialVehicles = simData.initial_vehicles;
    const allIncidents = sim.incidents;
    const assignmentLog = sim.assignment_log;

    const getQuadrant = (x, y) => {
      if (x < 50 && y >= 50) return 0; // Top-Left
      if (x >= 50 && y >= 50) return 1; // Top-Right
      if (x < 50 && y < 50) return 2; // Bottom-Left
      return 3; // Bottom-Right
    };

    // 1. Reconstruct vehicles
    const vehicles = initialVehicles.map(v => ({
      ...v,
      status: 'idle',
      quadrant: getQuadrant(v.x, v.y),
      targetIncident: null
    }));

    const assignmentsByVehicle = {};
    for (const entry of assignmentLog) {
      if (!assignmentsByVehicle[entry.vehicle_id]) assignmentsByVehicle[entry.vehicle_id] = [];
      assignmentsByVehicle[entry.vehicle_id].push(entry);
    }
    for (const vid of Object.keys(assignmentsByVehicle)) {
      assignmentsByVehicle[vid].sort((a, b) => a.minute - b.minute);
    }

    for (const vehicle of vehicles) {
      const vAssignments = assignmentsByVehicle[vehicle.id] || [];
      let lastX = vehicle.x;
      let lastY = vehicle.y;

      for (const entry of vAssignments) {
        const assignTime = entry.minute;
        const travelTime = entry.travel_time;
        const freeTime = assignTime + travelTime + busyDuration;
        const inc = allIncidents.find(i => i.id === entry.incident_id);
        if (!inc) continue;

        if (t >= freeTime) {
          lastX = inc.x;
          lastY = inc.y;
          vehicle.x = lastX;
          vehicle.y = lastY;
          vehicle.status = 'idle';
          vehicle.targetIncident = null;
        } else if (t >= assignTime && t < freeTime) {
          vehicle.status = 'busy';
          if (t < assignTime + travelTime) {
            const progress = (t - assignTime) / Math.max(0.01, travelTime);
            vehicle.x = lastX + (inc.x - lastX) * progress;
            vehicle.y = lastY + (inc.y - lastY) * progress;
            vehicle.targetIncident = inc;
          } else {
            vehicle.x = inc.x;
            vehicle.y = inc.y;
          }
          vehicle.quadrant = getQuadrant(vehicle.x, vehicle.y);
          break;
        } else {
          break;
        }
      }
      vehicle.quadrant = getQuadrant(vehicle.x, vehicle.y);
    }

    // 2. Determine active incidents
    const activeIncidents = allIncidents.filter(inc => {
      if (inc.arrival_time > t) return false;
      if (inc.assigned_time === null) return true;
      const busyEnd = inc.assigned_time + (inc.response_time || 0) + busyDuration;
      return t <= busyEnd;
    });

    // 3. Coverage Status
    const coverageEntry = sim.coverage_log.find(c => c.minute === t) || {
      quadrant_status: { 0: false, 1: false, 2: false, 3: false }
    };

    const idleCountPerQuad = { 0: 0, 1: 0, 2: 0, 3: 0 };
    vehicles.forEach(v => {
      if (v.status === 'idle') idleCountPerQuad[v.quadrant]++;
    });

    const dispatchesNow = assignmentLog.filter(a => a.minute === t);

    // 4. Metrics up to t
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

    return {
      minute: t,
      vehicles,
      activeIncidents,
      quadrantStatus: coverageEntry.quadrant_status,
      idleCountPerQuad,
      dispatchesNow,
      metrics: {
        priority_weighted_response_time: weightSum > 0 ? (wrtSum / weightSum) : 0,
        coverage_outage_minutes: outageMins,
        priority_3_response_time: p3Count > 0 ? (p3Sum / p3Count) : null,
        unassigned_count: unassignedCount
      }
    };
  }, []);

  // Update State when time, policy, or data changes
  useEffect(() => {
    if (data) {
      setSimState(getStateAtMinute(currentMinute, selectedPolicy, data));
    }
  }, [data, currentMinute, selectedPolicy, getStateAtMinute]);

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (currentMinute >= 120) {
          setIsPlaying(false);
        } else {
          setCurrentMinute(prev => prev + 1);
        }
      }, 500 / playbackSpeed);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentMinute, playbackSpeed]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const pause = () => setIsPlaying(false);
  const seek = (min) => {
    pause();
    setCurrentMinute(Math.max(0, Math.min(120, min)));
  };

  return {
    data,
    simState,
    currentMinute,
    selectedPolicy,
    setSelectedPolicy,
    isPlaying,
    togglePlay,
    pause,
    seek,
    playbackSpeed,
    setPlaybackSpeed,
  };
};
