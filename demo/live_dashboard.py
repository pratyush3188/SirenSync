"""
Animated dashboard to visualize the simulation minute-by-minute.
"""
import os
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.animation import FuncAnimation, PillowWriter
from typing import List, Dict, Any

from src.entities import Vehicle, Incident
from src.config import BUSY_DURATION

def create_live_dashboard(initial_vehicles: List[Vehicle], incidents: List[Incident], 
                          assignment_log: List[Dict[str, Any]], coverage_log: List[Dict[str, Any]], 
                          save_path: str = None) -> None:
    """
    Reconstructs the simulation state and animates it from minute 0 to 120.
    
    If save_path is provided, saves as a GIF headlessly. 
    Otherwise, it opens an interactive Matplotlib window for a live demo.
    """
    # 1. Prepare data structures for timeline reconstruction
    incident_map = {inc.id: inc for inc in incidents}
    
    # v_moves[v_id] = [(start_t, end_t, start_x, start_y, end_x, end_y, busy_end_t)]
    v_moves = {v.id: [] for v in initial_vehicles}
    v_initial = {v.id: (v.x, v.y) for v in initial_vehicles}
    
    # Sort assignment_log by minute to build chronological timelines
    sorted_log = sorted(assignment_log, key=lambda x: x["minute"])
    
    last_known_pos = {v.id: (v.x, v.y) for v in initial_vehicles}
    
    for entry in sorted_log:
        v_id = entry["vehicle_id"]
        inc = incident_map[entry["incident_id"]]
        
        start_t = entry["minute"]
        travel = entry["travel_time"]
        end_t = start_t + travel
        busy_end_t = end_t + BUSY_DURATION
        
        start_x, start_y = last_known_pos[v_id]
        end_x, end_y = inc.x, inc.y
        
        v_moves[v_id].append((start_t, end_t, start_x, start_y, end_x, end_y, busy_end_t))
        last_known_pos[v_id] = (end_x, end_y)
        
    def get_vehicle_state(v_id: int, t: int):
        """Interpolates vehicle position and status at exactly minute t."""
        moves = v_moves[v_id]
        pos_x, pos_y = v_initial[v_id]
        status = "idle"
        
        for move in moves:
            start_t, end_t, start_x, start_y, end_x, end_y, busy_end_t = move
            if t < start_t:
                break # hasn't started this move yet
            if start_t <= t < end_t:
                # Interpolating position during travel
                progress = (t - start_t) / (end_t - start_t)
                pos_x = start_x + progress * (end_x - start_x)
                pos_y = start_y + progress * (end_y - start_y)
                status = "busy"
            elif end_t <= t < busy_end_t:
                # Stationary at incident, still servicing it
                pos_x, pos_y = end_x, end_y
                status = "busy"
            else:
                # Finished servicing, waiting for next assignment
                pos_x, pos_y = end_x, end_y
                status = "idle"
                
        return pos_x, pos_y, status

    # 2. Setup Plot
    if save_path:
        matplotlib.use("Agg")
        
    fig, ax = plt.subplots(figsize=(10, 10))
    
    def update(frame):
        ax.clear()
        t = frame
        
        # --- Quadrant Shading ---
        cov_idx = min(t, len(coverage_log) - 1)
        cov = coverage_log[cov_idx]["quadrant_status"]
        
        q_coords = {
            0: (0, 50, 0, 50),
            1: (50, 100, 0, 50),
            2: (0, 50, 50, 100),
            3: (50, 100, 50, 100)
        }
        
        for q_id, (x_min, x_max, y_min, y_max) in q_coords.items():
            is_outage = cov.get(str(q_id), cov.get(q_id, False))
            facecolor = "#ffcccc" if is_outage else "#ccffcc" # Red for outage, Green for covered
            rect = patches.Rectangle((x_min, y_min), 50, 50, linewidth=0, facecolor=facecolor, alpha=0.5, zorder=0)
            ax.add_patch(rect)
            
        # Grid lines
        ax.axvline(x=50, color='gray', linestyle='--', alpha=0.7)
        ax.axhline(y=50, color='gray', linestyle='--', alpha=0.7)
        
        # --- Plot Vehicles ---
        idle_x, idle_y = [], []
        busy_x, busy_y = [], []
        for v in initial_vehicles:
            vx, vy, status = get_vehicle_state(v.id, t)
            if status == "idle":
                idle_x.append(vx)
                idle_y.append(vy)
            else:
                busy_x.append(vx)
                busy_y.append(vy)
                
        ax.scatter(idle_x, idle_y, color="green", marker="o", s=100, label="Idle Vehicle", edgecolor="black", zorder=3)
        ax.scatter(busy_x, busy_y, color="gray", marker="o", s=100, label="Busy Vehicle", edgecolor="black", zorder=3)
        
        # --- Plot Waiting Incidents ---
        p1_x, p1_y = [], []
        p2_x, p2_y = [], []
        p3_x, p3_y = [], []
        un_x, un_y = [], []
        
        for inc in incidents:
            if inc.arrival_time <= t:
                # Show incident if it hasn't been assigned yet by minute t
                if inc.assigned_time is None:
                    un_x.append(inc.x)
                    un_y.append(inc.y)
                elif t < inc.assigned_time:
                    if inc.priority == 1:
                        p1_x.append(inc.x)
                        p1_y.append(inc.y)
                    elif inc.priority == 2:
                        p2_x.append(inc.x)
                        p2_y.append(inc.y)
                    else:
                        p3_x.append(inc.x)
                        p3_y.append(inc.y)
                        
        ax.scatter(p1_x, p1_y, color="yellow", marker="X", s=80, label="Waiting Priority 1", edgecolor="black", zorder=4)
        ax.scatter(p2_x, p2_y, color="orange", marker="X", s=80, label="Waiting Priority 2", edgecolor="black", zorder=4)
        ax.scatter(p3_x, p3_y, color="red", marker="X", s=80, label="Waiting Priority 3", edgecolor="black", zorder=4)
        if un_x:
            ax.scatter(un_x, un_y, color="black", marker="X", s=80, label="Unresolved", edgecolor="white", zorder=4)
            
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        ax.set_xlabel("X Coordinate")
        ax.set_ylabel("Y Coordinate")
        ax.set_title(f"Live Simulation - Minute: {t}")
        
        # Deduplicate legend
        handles, labels = ax.get_legend_handles_labels()
        by_label = dict(zip(labels, handles))
        if by_label:
            ax.legend(by_label.values(), by_label.keys(), loc="upper right", bbox_to_anchor=(1.35, 1))
            
        ax.grid(True, alpha=0.3)
        
    ani = FuncAnimation(fig, update, frames=range(0, 121), interval=100, repeat=False)
    
    if save_path:
        out_dir = os.path.dirname(save_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir)
        writer = PillowWriter(fps=10)
        ani.save(save_path, writer=writer)
        plt.close(fig)
    else:
        plt.tight_layout()
        plt.show()

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from src.generator import generate_scenario
    from src.simulator import run_simulation
    from src.dispatcher import choose_vehicle
    
    print("Generating scenario and running simulation for live demo...")
    vehicles, incidents = generate_scenario()
    results = run_simulation(vehicles, incidents, choose_vehicle)
    
    print("Launching Live Dashboard...")
    create_live_dashboard(vehicles, results["final_incidents"], results["assignment_log"], results["coverage_log"], save_path=None)
