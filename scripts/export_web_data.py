"""
Export simulation data for SirenSync Web Application.
Generates simulation_data.json containing initial positions, assignment logs,
minute-by-minute coverage, metrics, audit results, and multi-seed benchmarks
for both Baseline and SirenSync Reserve-Threshold dispatchers.
"""

import os
import sys
import json
import copy

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import src.generator as gen
from src.simulator import run_simulation
from src.dispatcher import choose_vehicle as advanced_dispatcher
from src.baseline_dispatcher import choose_vehicle as baseline_dispatcher
from src.metrics import compute_metrics
from src.validator import validate_simulation
from src.config import SEED, BUSY_DURATION, GRID_SIZE, NUM_VEHICLES, NUM_INCIDENTS, SIM_MINUTES

def serialize_vehicle(v):
    return {
        "id": v.id,
        "x": v.x,
        "y": v.y,
        "status": v.status,
        "quadrant": v.quadrant,
        "free_at_time": v.free_at_time
    }

def serialize_incident(inc):
    return {
        "id": inc.id,
        "x": inc.x,
        "y": inc.y,
        "priority": inc.priority,
        "arrival_time": inc.arrival_time,
        "assigned_time": inc.assigned_time,
        "assigned_vehicle_id": inc.assigned_vehicle_id,
        "response_time": round(inc.response_time, 2) if inc.response_time is not None else None
    }

def run_single_dispatcher(vehicles_init, incidents_init, dispatcher_fn, name):
    vehicles = copy.deepcopy(vehicles_init)
    incidents = copy.deepcopy(incidents_init)
    
    result = run_simulation(vehicles, incidents, dispatcher_fn)
    metrics = compute_metrics(result["final_incidents"], result["coverage_log"])
    audit = validate_simulation(result["assignment_log"], result["final_incidents"])
    
    return {
        "name": name,
        "assignment_log": result["assignment_log"],
        "coverage_log": result["coverage_log"],
        "unassigned_incident_ids": result["unassigned_incident_ids"],
        "incidents": [serialize_incident(inc) for inc in result["final_incidents"]],
        "final_vehicles": [serialize_vehicle(v) for v in result["final_vehicles"]],
        "metrics": metrics,
        "audit": audit
    }

def run_multi_seed_comparison():
    seeds = [SEED] + [99990000 + i for i in range(1, 15)]
    multi_seed_results = []
    
    for s in seeds:
        gen.SEED = s
        v_init, inc_init = gen.generate_scenario()
        
        # Advanced
        v_adv = copy.deepcopy(v_init)
        i_adv = copy.deepcopy(inc_init)
        res_adv = run_simulation(v_adv, i_adv, advanced_dispatcher)
        met_adv = compute_metrics(res_adv["final_incidents"], res_adv["coverage_log"])
        
        # Baseline
        v_base = copy.deepcopy(v_init)
        i_base = copy.deepcopy(inc_init)
        res_base = run_simulation(v_base, i_base, baseline_dispatcher)
        met_base = compute_metrics(res_base["final_incidents"], res_base["coverage_log"])
        
        multi_seed_results.append({
            "seed": s,
            "siren_sync": {
                "weighted_response": round(met_adv["priority_weighted_response_time"], 2),
                "coverage_outages": met_adv["coverage_outage_minutes"],
                "p3_response": round(met_adv["priority_3_response_time"], 2) if met_adv["priority_3_response_time"] else None,
                "unassigned": met_adv["unassigned_count"]
            },
            "baseline": {
                "weighted_response": round(met_base["priority_weighted_response_time"], 2),
                "coverage_outages": met_base["coverage_outage_minutes"],
                "p3_response": round(met_base["priority_3_response_time"], 2) if met_base["priority_3_response_time"] else None,
                "unassigned": met_base["unassigned_count"]
            }
        })
    return multi_seed_results

def export_web_data():
    gen.SEED = SEED
    initial_vehicles, initial_incidents = gen.generate_scenario()
    
    vehicles_serialized = [serialize_vehicle(v) for v in initial_vehicles]
    incidents_serialized = [serialize_incident(inc) for inc in initial_incidents]
    
    siren_sync_sim = run_single_dispatcher(initial_vehicles, initial_incidents, advanced_dispatcher, "SirenSync Reserve-Threshold")
    baseline_sim = run_single_dispatcher(initial_vehicles, initial_incidents, baseline_dispatcher, "Baseline Nearest Vehicle")
    
    multi_seed_data = run_multi_seed_comparison()
    
    web_data = {
        "config": {
            "seed": SEED,
            "grid_size": GRID_SIZE,
            "num_vehicles": NUM_VEHICLES,
            "num_incidents": NUM_INCIDENTS,
            "sim_minutes": SIM_MINUTES,
            "busy_duration": BUSY_DURATION
        },
        "initial_vehicles": vehicles_serialized,
        "initial_incidents": incidents_serialized,
        "siren_sync": siren_sync_sim,
        "baseline": baseline_sim,
        "multi_seed": multi_seed_data
    }
    
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "data"))
    os.makedirs(output_dir, exist_ok=True)
    
    json_path = os.path.join(output_dir, "simulation_data.json")
    with open(json_path, "w") as f:
        json.dump(web_data, f, indent=2)
        
    print(f"[OK] Web data successfully exported to {json_path}")
    return json_path

if __name__ == "__main__":
    export_web_data()
