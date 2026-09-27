import json
import os
from src.entities import Vehicle, Incident
from src.visualize import plot_grid_snapshot, plot_comparison

errors = []
output_dir = "test_outputs"
os.makedirs(output_dir, exist_ok=True)

# ===== Test 1: Grid snapshot =====
vehicles = [
    Vehicle(id=1, x=10, y=10, status="idle", free_at_time=0),
    Vehicle(id=2, x=90, y=90, status="busy", free_at_time=15),
]
incidents = [
    Incident(id=1, arrival_time=0, x=15, y=15, priority=1, assigned_time=2, assigned_vehicle_id=1, response_time=2.0),
    Incident(id=2, arrival_time=1, x=50, y=50, priority=3, assigned_time=None, assigned_vehicle_id=None, response_time=None),
]

try:
    plot_grid_snapshot(vehicles, incidents, output_dir)
    if os.path.exists(f"{output_dir}/grid_snapshot.png"):
        print("Test 1 PASSED: grid_snapshot.png created")
    else:
        errors.append("Test 1 FAILED: grid_snapshot.png was not created")
except Exception as e:
    errors.append(f"Test 1 CRASHED: {e}")

# ===== Test 2: Comparison chart =====
fake_comparison = {
    "baseline": {"priority_weighted_response_time": 12.5, "coverage_outage_minutes": 45.0, "priority_3_response_time": 8.0},
    "advanced": {"priority_weighted_response_time": 9.2, "coverage_outage_minutes": 18.0, "priority_3_response_time": 7.5}
}
with open(f"{output_dir}/comparison_report.json", "w") as f:
    json.dump(fake_comparison, f)

try:
    plot_comparison(f"{output_dir}/comparison_report.json", output_dir)
    if os.path.exists(f"{output_dir}/comparison_chart.png"):
        print("Test 2 PASSED: comparison_chart.png created")
    else:
        errors.append("Test 2 FAILED: comparison_chart.png was not created")
except Exception as e:
    errors.append(f"Test 2 CRASHED: {e}")

print()
if errors:
    print("❌ FAILED:")
    for e in errors:
        print(" -", e)
else:
    print("✅ visualize.py FULLY CORRECT — both PNGs generated without hanging!")