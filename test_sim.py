import os
import sys

# temporarily mock sys.argv
sys.argv = ['main.py']

from src import config
from src.generator import generate_scenario
from src.simulator import run_simulation
from src.dispatcher import choose_vehicle as advanced_dispatcher
from src.baseline_dispatcher import choose_vehicle as baseline_dispatcher
from src.metrics import compute_metrics
import copy

def test_config(v, i):
    config.NUM_VEHICLES = v
    config.NUM_INCIDENTS = i
    vehicles, incidents = generate_scenario()
    
    vehicles_adv = copy.deepcopy(vehicles)
    incidents_adv = copy.deepcopy(incidents)
    
    vehicles_base = copy.deepcopy(vehicles)
    incidents_base = copy.deepcopy(incidents)
    
    results_adv = run_simulation(vehicles_adv, incidents_adv, advanced_dispatcher)
    metrics_adv = compute_metrics(results_adv['final_incidents'], results_adv['coverage_log'])
    
    results_base = run_simulation(vehicles_base, incidents_base, baseline_dispatcher)
    metrics_base = compute_metrics(results_base['final_incidents'], results_base['coverage_log'])
    
    print(f"V={v}, I={i}")
    print(f"  Outage:     {metrics_adv['coverage_outage_minutes']} vs {metrics_base['coverage_outage_minutes']}")
    print(f"  Wait(All):  {metrics_adv['priority_weighted_response_time']:.2f} vs {metrics_base['priority_weighted_response_time']:.2f}")
    print(f"  Wait(P3):   {metrics_adv['priority_3_response_time']:.2f} vs {metrics_base['priority_3_response_time']:.2f}")

print("Testing configs...")
for v in [16, 20, 24, 28, 30, 40]:
    for i in [50, 75, 100, 125, 150]:
        test_config(v, i)

