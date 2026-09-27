"""
Validator module for the Emergency Fleet Assignment project.

This acts as a transparency and trust tool. It is run after every simulation
to prove to the hackathon judges that the algorithm never cheated by looking into the
future (causality rule) and never mathematically double-booked a vehicle
while it was supposed to be busy.
"""

from typing import List, Dict, Any
from src.entities import Incident
from src.config import BUSY_DURATION

def validate_simulation(assignment_log: List[Dict[str, Any]], incidents: List[Incident]) -> Dict[str, Any]:
    """
    Audits the simulation assignment log against the known incident data.
    Ensures absolute compliance with the strict online/causality constraints.
    """
    causality_violations: List[str] = []
    double_booking_violations: List[str] = []
    total_checks_run = len(assignment_log)
    
    # Pre-index incidents by id for fast O(1) lookup
    incident_map = {inc.id: inc for inc in incidents}
    
    # --- CHECK 1: Causality Violations ---
    for entry in assignment_log:
        incident = incident_map[entry["incident_id"]]
        # The incident must have arrived AT or BEFORE the minute it was assigned
        if incident.arrival_time > entry["minute"]:
            violation = (f"Causality Violation! Incident {incident.id} arrived at minute {incident.arrival_time} "
                         f"but was impossibly assigned in the past at minute {entry['minute']}.")
            causality_violations.append(violation)
            
    # --- CHECK 2: Double-Booking Violations ---
    # Group assignments by vehicle
    vehicle_assignments: Dict[int, List[Dict[str, Any]]] = {}
    for entry in assignment_log:
        v_id = entry["vehicle_id"]
        if v_id not in vehicle_assignments:
            vehicle_assignments[v_id] = []
        vehicle_assignments[v_id].append(entry)
        
    for v_id, assignments in vehicle_assignments.items():
        # Sort by the minute the assignment occurred
        assignments.sort(key=lambda x: x["minute"])
        
        # Check consecutive assignments for this vehicle
        for i in range(len(assignments) - 1):
            curr_entry = assignments[i]
            next_entry = assignments[i + 1]
            
            # The precise time the vehicle becomes free = assignment minute + travel + service duration
            curr_free_at = curr_entry["minute"] + curr_entry["travel_time"] + BUSY_DURATION
            
            # The next assignment must occur AT or AFTER the moment the vehicle became free
            if next_entry["minute"] < curr_free_at:
                violation = (f"Double Booking Violation! Vehicle {v_id} assigned to Incident {curr_entry['incident_id']} "
                             f"at min {curr_entry['minute']} (busy until {curr_free_at:.2f}), but was re-assigned "
                             f"early to Incident {next_entry['incident_id']} at min {next_entry['minute']}.")
                double_booking_violations.append(violation)
                
    passed = (len(causality_violations) == 0 and len(double_booking_violations) == 0)
    
    return {
        "passed": passed,
        "causality_violations": causality_violations,
        "double_booking_violations": double_booking_violations,
        "total_checks_run": total_checks_run
    }
