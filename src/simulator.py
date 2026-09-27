"""
Simulator module for the Emergency Fleet Assignment project.
Handles the minute-by-minute simulation loop.
"""

from typing import List, Callable, Dict, Any
from src.entities import Vehicle, Incident, get_quadrant, euclidean_distance
from src import config

def run_simulation(vehicles: List[Vehicle], incidents: List[Incident], dispatcher_fn: Callable) -> Dict[str, Any]:
    """
    Runs the simulation loop from minute 0 to SIM_MINUTES (inclusive).
    
    The simulation exactly follows this per-minute order:
    1. Process Vehicle Completions
    2. Reveal New Incidents
    3. Dispatch / Process Waiting Queue
    4. Record Coverage
    
    This exact strict order ensures compliance with the causal online rules 
    (no looking into the future or at unrevealed incidents).
    """
    
    waiting_queue: List[Incident] = []
    assignment_log: List[Dict[str, Any]] = []
    coverage_log: List[Dict[str, Any]] = []
    
    for t in range(config.SIM_MINUTES + 1):
        
        # STEP 1 - Process completions
        # Mark busy vehicles as idle if their free_at_time has elapsed
        for v in vehicles:
            if v.status == "busy" and v.free_at_time <= t:
                v.status = "idle"
                # Recompute the quadrant just in case it's stale
                v.quadrant = get_quadrant(v.x, v.y)
                
        # STEP 2 - Reveal incidents
        # Find incidents arriving exactly at t, sorted by incident id
        arrived_now = [inc for inc in incidents if inc.arrival_time == t]
        arrived_now.sort(key=lambda x: x.id)
        waiting_queue.extend(arrived_now)
        
        # STEP 3 - Process the waiting_queue
        # Sort queue by: priority descending, then arrival_time ascending, then incident_id ascending
        waiting_queue.sort(key=lambda x: (-x.priority, x.arrival_time, x.id))
        
        still_waiting: List[Incident] = []
        
        for i, inc in enumerate(waiting_queue):
            # Recompute idle vehicles fresh for each incident to prevent double-assignment in the same minute
            idle_vehicles = [v for v in vehicles if v.status == "idle"]
            
            if not idle_vehicles:
                # If no idle vehicles remain, this incident and all remaining stay queued for the next minute
                still_waiting.extend(waiting_queue[i:])
                break
                
            # Only idle vehicles are passed to the dispatcher (online rule compliance)
            assigned_vehicle = dispatcher_fn(inc, idle_vehicles, vehicles, t)
            
            # Apply assignment updates
            distance = euclidean_distance((assigned_vehicle.x, assigned_vehicle.y), (inc.x, inc.y))
            travel_time = distance / config.VEHICLE_SPEED
            
            assigned_vehicle.status = "busy"
            assigned_vehicle.free_at_time = t + travel_time + config.BUSY_DURATION
            assigned_vehicle.x = inc.x
            assigned_vehicle.y = inc.y
            # Update quadrant immediately at assignment
            assigned_vehicle.quadrant = get_quadrant(assigned_vehicle.x, assigned_vehicle.y)
            
            inc.assigned_time = t
            inc.assigned_vehicle_id = assigned_vehicle.id
            inc.response_time = travel_time
            
            assignment_log.append({
                "minute": t,
                "incident_id": inc.id,
                "vehicle_id": assigned_vehicle.id,
                "travel_time": travel_time
            })
            
        # Update waiting queue with only those that weren't assigned this minute
        waiting_queue = still_waiting
        
        # STEP 4 - Coverage check
        idle_vehicles = [v for v in vehicles if v.status == "idle"]
        
        # True means "has zero idle vehicles" (an outage)
        quadrant_outages = {0: True, 1: True, 2: True, 3: True}
        for v in idle_vehicles:
            quadrant_outages[v.quadrant] = False
            
        coverage_log.append({
            "minute": t,
            "quadrant_status": quadrant_outages
        })
        
    return {
        "assignment_log": assignment_log,
        "coverage_log": coverage_log,
        "final_incidents": incidents,
        "final_vehicles": vehicles,
        "unassigned_incident_ids": [inc.id for inc in waiting_queue]
    }
