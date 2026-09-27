"""
Robustness testing script for the Emergency Fleet Assignment project.
Runs the simulation pipeline across 15 different seeds to prove that our
dispatcher's performance generalizes and isn't overfit to a single scenario.
"""

import os
import sys
import pandas as pd

# Ensure src package is accessible when running from the scripts/ directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import the module directly so we can dynamically overwrite its SEED constant
import src.generator as gen
from src.simulator import run_simulation
from src.dispatcher import choose_vehicle
from src.metrics import compute_metrics
from src.config import SEED as BASE_SEED

def run_robustness_test():
    # 1 base seed + 14 arbitrary distinct seeds
    seeds = [BASE_SEED] + [99990000 + i for i in range(1, 15)]
    print(f"Running robustness test across {len(seeds)} seeds...")
    
    results_list = []
    
    for i, seed in enumerate(seeds):
        # Override the generator's local copy of SEED for this specific run
        gen.SEED = seed
        
        # 1. Generate
        vehicles, incidents = gen.generate_scenario()
        
        # 2. Simulate
        sim_result = run_simulation(vehicles, incidents, choose_vehicle)
        
        # 3. Compute Metrics
        metrics = compute_metrics(sim_result["final_incidents"], sim_result["coverage_log"])
        
        results_list.append({
            "seed": seed,
            "weighted_response": metrics["priority_weighted_response_time"],
            "coverage_outages": metrics["coverage_outage_minutes"],
            "p3_response": metrics["priority_3_response_time"]
        })
        
        print(f"Run {i+1:02d}/{len(seeds)} (Seed {seed}) complete.")
        
    df = pd.DataFrame(results_list)
    
    # Calculate Mean and Standard Deviation across all runs
    summary = df.agg({
        "weighted_response": ["mean", "std"],
        "coverage_outages": ["mean", "std"],
        "p3_response": ["mean", "std"]
    }).round(2)
    
    print("\n" + "="*60)
    print("ROBUSTNESS TEST SUMMARY (15 Seeds) - Mean & Std Dev")
    print("="*60)
    print(summary.to_string())
    print("="*60)
    
    # Save the tables
    output_dir = "outputs"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    df.to_csv(os.path.join(output_dir, "multi_seed_raw_data.csv"), index=False)
    summary.to_csv(os.path.join(output_dir, "multi_seed_summary.csv"))
    
    print(f"\nSaved raw data and summary table to the '{output_dir}/' directory.")

if __name__ == "__main__":
    run_robustness_test()
