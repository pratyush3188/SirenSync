import os
from src.entities import Vehicle, Incident
from src.config import BUSY_DURATION
from demo.live_dashboard import create_live_dashboard

errors = []
output_dir = "test_outputs"
os.makedirs(output_dir, exist_ok=True)

# Fake minimal data
initial_vehicles = [
    Vehicle(id=1, x=10, y=10, status="idle", free_at_time=0),
    Vehicle(id=2, x=90, y=90, status="idle", free_at_time=0),
]
incidents = [
    Incident(id=1, arrival_time=0, x=15, y=15, priority=1, assigned_time=2, assigned_vehicle_id=1, response_time=5.0),
    Incident(id=2, arrival_time=3, x=50, y=50, priority=3, assigned_time=None, assigned_vehicle_id=None, response_time=None),
]
assignment_log = [
    {"minute": 2, "incident_id": 1, "vehicle_id": 1, "travel_time": 5.0},
]
coverage_log = [
    {"minute": t, "quadrant_status": {0: (t < 5), 1: False, 2: False, 3: False}}
    for t in range(0, 10) 
]


save_path = f"{output_dir}/test_dashboard.gif"

try:
    create_live_dashboard(initial_vehicles, incidents, assignment_log, coverage_log, save_path=save_path)
    if os.path.exists(save_path):
        print("✅ PASSED: Dashboard GIF created without crashing or hanging")
    else:
        errors.append("GIF file was not created")
except Exception as e:
    errors.append(f"CRASHED: {e}")

print()
if errors:
    print("❌ FAILED:")
    for e in errors:
        print(" -", e)
else:
    print("✅ live_dashboard.py FULLY CORRECT (basic check)!")