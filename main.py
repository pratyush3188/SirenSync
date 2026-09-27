"""
Main entry point for SirenSync - Emergency Fleet Assignment System.
"""

import sys
import os
import argparse
import json
import webbrowser
import subprocess
import time

from src import config
from src.generator import generate_scenario
from src.simulator import run_simulation
from src.dispatcher import choose_vehicle as advanced_dispatcher
from src.baseline_dispatcher import choose_vehicle as baseline_dispatcher
from src.metrics import compute_metrics, save_results
from src.validator import validate_simulation
from scripts.export_web_data import export_web_data

def main():
    parser = argparse.ArgumentParser(description="SirenSync Main Simulation Entry")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for the simulation")
    args = parser.parse_args()

    if args.seed is not None:
        config.SEED = args.seed
        
    print("=" * 70)
    print(" [SirenSync: Emergency Fleet Assignment with Coverage Preservation]")
    print(f" Seed: {config.SEED}")
    print("=" * 70)
    
    # 1. Generate Scenario
    print("\n[1/5] Generating scenario (20 vehicles, 100 incidents, 100x100 grid)...")
    import src.generator as gen
    gen.SEED = config.SEED
    vehicles, incidents = generate_scenario()
    
    # We need copies since simulation modifies them in-place
    import copy
    vehicles_adv = copy.deepcopy(vehicles)
    incidents_adv = copy.deepcopy(incidents)
    
    vehicles_base = copy.deepcopy(vehicles)
    incidents_base = copy.deepcopy(incidents)
    
    # 2. Run SirenSync (Advanced) Simulation
    print("[2/5] Running SirenSync (Reserve-Threshold) Dispatcher...")
    results_adv = run_simulation(vehicles_adv, incidents_adv, advanced_dispatcher)
    metrics_adv = compute_metrics(results_adv['final_incidents'], results_adv['coverage_log'])
    audit_adv = validate_simulation(results_adv['assignment_log'], results_adv['final_incidents'])
    save_results(results_adv['final_incidents'], metrics_adv, "outputs")
    
    # 3. Run Baseline (Naive Nearest) Simulation for comparison
    print("[3/5] Running Baseline (Naive Nearest) Dispatcher for comparison...")
    results_base = run_simulation(vehicles_base, incidents_base, baseline_dispatcher)
    metrics_base = compute_metrics(results_base['final_incidents'], results_base['coverage_log'])
    
    comparison_report = {
        "seed": config.SEED,
        "sirensync": metrics_adv,
        "baseline": metrics_base
    }
    os.makedirs("test_outputs", exist_ok=True)
    with open("test_outputs/comparison_report.json", "w") as f:
        json.dump(comparison_report, f, indent=4)
    
    # 4. Audit & Validation
    print("\n[4/5] Running strict online causal validator...")
    causality_pass = len(audit_adv['causality_violations']) == 0
    double_booking_pass = len(audit_adv['double_booking_violations']) == 0
    print(f"  • Causality Rule Validation: {'PASS' if causality_pass else 'FAIL'}")
    print(f"  • Double-Booking Validation: {'PASS' if double_booking_pass else 'FAIL'}")

    # 5. Summary & Web Export
    print("\n[5/5] Exporting Data and Launching Dashboard...")
    # This export script reads config.SEED dynamically
    export_web_data()
    
    print("\n" + "-" * 70)
    print(" SUMMARY (SirenSync vs Baseline):")
    print(f" Outage Minutes:       {metrics_adv['coverage_outage_minutes']} vs {metrics_base['coverage_outage_minutes']}")
    print(f" Weighted Response:    {metrics_adv['priority_weighted_response_time']:.2f}m vs {metrics_base['priority_weighted_response_time']:.2f}m")
    print(f" Priority-3 Response:  {metrics_adv['priority_3_response_time']:.2f}m vs {metrics_base['priority_3_response_time']:.2f}m")
    print("-" * 70)
    
    # Start the HTTP server as a background process so the script can finish and open browser
    print("\nStarting local web server...")
    web_dir = os.path.abspath("web")
    
    # Using sys.executable to ensure the correct Python is used
    server_process = subprocess.Popen([sys.executable, "-m", "http.server", "8000"], cwd=web_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print("Opening browser to http://localhost:8000/ ...")
    time.sleep(1) # Give server a moment to bind to port
    webbrowser.open("http://localhost:8000/")
    print("Press Ctrl+C to stop the server when finished.")
    
    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server_process.terminate()

if __name__ == "__main__":
    main()
