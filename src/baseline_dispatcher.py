"""
Baseline Dispatcher: Simple nearest-vehicle policy.
Serves as a comparison baseline against our advanced reserve-threshold dispatcher.
"""
from typing import List
from src.entities import Vehicle, Incident, euclidean_distance

def choose_vehicle(incident: Incident, idle_vehicles: List[Vehicle], all_vehicles: List[Vehicle], current_time: int) -> Vehicle:
    """
    Selects the nearest idle vehicle to the incident.
    
    This is the baseline naive approach: it completely ignores quadrant coverage
    reserves and incident priorities, simply dispatching whatever is closest.
    
    Assumes `idle_vehicles` is never empty (this is guaranteed by the simulator logic).
    If there is a distance tie, it resolves it by picking the lowest vehicle ID 
    to ensure deterministic reproducibility.
    """
    # Find the vehicle with the minimum distance.
    # The tuple (distance, v.id) ensures that if distances are equal, 
    # the vehicle with the smaller ID wins, keeping things 100% reproducible.
    return min(
        idle_vehicles, 
        key=lambda v: (euclidean_distance((v.x, v.y), (incident.x, incident.y)), v.id)
    )
