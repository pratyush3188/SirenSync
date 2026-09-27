"""
Metrics calculation and output generation for the Emergency Fleet Assignment project.
"""
import os
import json
import pandas as pd
from typing import List, Dict, Any, Optional
from src.entities import Incident
from src.config import PRIORITY_WEIGHTS

def compute_metrics(incidents: List[Incident], coverage_log: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes key performance metrics for the simulation run.
    
    Returns a dictionary with:
    - priority_weighted_response_time: Weighted average response time.
    - coverage_outage_minutes: Total minutes across all quadrants where zero idle vehicles 
      were available.
    - priority_3_response_time: Average response time specifically for priority 3.
    - unassigned_count: Number of incidents that were never assigned a vehicle.
    """
    
    # 1. Priority-Weighted Response Time tracking
    total_weighted_time = 0.0
    total_weights = 0.0
    
    # 2. Priority-3 Response Time tracking
    p3_total_time = 0.0
    p3_count = 0
    
    # 3. Unassigned count tracking
    unassigned_count = 0
    
    for inc in incidents:
        if inc.response_time is None:
            unassigned_count += 1
            continue
            
        weight = PRIORITY_WEIGHTS[inc.priority]
        total_weighted_time += (weight * inc.response_time)
        total_weights += weight
        
        if inc.priority == 3:
            p3_total_time += inc.response_time
            p3_count += 1
            
    # Calculate weighted average
    if total_weights > 0:
        priority_weighted_response_time = round(total_weighted_time / total_weights, 2)
    else:
        priority_weighted_response_time = 0.0
        
    # Calculate P3 average
    if p3_count > 0:
        priority_3_response_time = round(p3_total_time / p3_count, 2)
    else:
        priority_3_response_time = None
        
    # 4. Coverage Outage Minutes tracking
    coverage_outage_minutes = 0
    for entry in coverage_log:
        status_dict = entry["quadrant_status"]
        # sum() on booleans treats True as 1 and False as 0, adding up the total outages this minute
        coverage_outage_minutes += sum(status_dict.values())
        
    return {
        "priority_weighted_response_time": priority_weighted_response_time,
        "coverage_outage_minutes": coverage_outage_minutes,
        "priority_3_response_time": priority_3_response_time,
        "unassigned_count": unassigned_count
    }

def save_results(incidents: List[Incident], metrics_dict: Dict[str, Any], output_dir: str) -> None:
    """
    Saves the incident details to a CSV file and the computed metrics to a JSON file.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # 1. Save incidents to CSV using pandas
    incident_data = []
    for inc in incidents:
        incident_data.append({
            "incident_id": inc.id,
            "priority": inc.priority,
            "arrival_time": inc.arrival_time,
            "assigned_vehicle_id": inc.assigned_vehicle_id,
            "response_time": round(inc.response_time, 2) if inc.response_time is not None else None
        })
        
    df = pd.DataFrame(incident_data)
    csv_path = os.path.join(output_dir, "results.csv")
    df.to_csv(csv_path, index=False)
    
    # 2. Save metrics to JSON
    json_path = os.path.join(output_dir, "summary.json")
    with open(json_path, "w") as f:
        json.dump(metrics_dict, f, indent=4)
