"""
Main Dispatcher logic: The Reserve-Threshold Policy.

Design Rationale:
This policy balances the critical need for fast response times with the strategic
necessity of maintaining geographical coverage (preventing quadrant outages).
- It provides a "fast-path" for highest-urgency incidents (Priority 3), guaranteeing
  them the absolute fastest response regardless of coverage.
- For lower-priority incidents (1 and 2), it introduces a "reserve-threshold" check:
  it prefers the closest vehicle, but will skip it and pull from further away if
  dispatching the closest vehicle would leave a quadrant completely unmonitored.
"""
from typing import List
from src.entities import Vehicle, Incident, euclidean_distance

def choose_vehicle(incident: Incident, idle_vehicles: List[Vehicle], all_vehicles: List[Vehicle], current_time: int) -> Vehicle:
    """
    Selects the best vehicle to assign to an incident using the reserve-threshold policy.
    
    Assumes `idle_vehicles` is never empty.
    """
    # Sort all idle vehicles by distance (nearest first), breaking ties by lowest vehicle id
    sorted_idle = sorted(
        idle_vehicles, 
        key=lambda v: (euclidean_distance((v.x, v.y), (incident.x, incident.y)), v.id)
    )
    
    # Priority-3 Fast-Path:
    # Always take the absolute nearest vehicle to minimize response time for critical emergencies,
    # completely ignoring coverage/reserve impacts.
    if incident.priority == 3:
        return sorted_idle[0]
        
    # Pre-compute quadrant reserves to avoid redundant counting inside the loop
    idle_count_per_quadrant = {0: 0, 1: 0, 2: 0, 3: 0}
    for v in idle_vehicles:
        idle_count_per_quadrant[v.quadrant] += 1
        
    # Reserve-Check Loop (For Priorities 1 and 2):
    # Iterate through candidates starting from nearest. We want the nearest one that
    # does NOT deplete its quadrant's reserve down to zero.
    for candidate in sorted_idle:
        if idle_count_per_quadrant[candidate.quadrant] > 1:
            # Picking this candidate leaves at least 1 idle vehicle in the quadrant. Safe!
            return candidate
            
    # Fallback:
    # If we made it here, every available idle vehicle is the *last* one in its respective quadrant.
    # We must respond to the incident, so we are forced to break a reserve. We fall back to the 
    # nearest vehicle overall (the first one in our sorted list).
    return sorted_idle[0]
