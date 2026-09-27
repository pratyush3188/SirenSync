"""
Visualization module for the Emergency Fleet Assignment project.
Generates static charts and grid plots using Matplotlib (headless).
"""
import os
import json
import matplotlib
matplotlib.use("Agg")  # Run headlessly, no GUI windows
import matplotlib.pyplot as plt
import numpy as np
from typing import List
from src.entities import Vehicle, Incident

def plot_grid_snapshot(vehicles: List[Vehicle], incidents: List[Incident], output_dir: str) -> None:
    """
    Plots the final physical state of the simulation grid.
    Shows vehicles (by idle/busy status) and incidents (by priority/unassigned).
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    plt.figure(figsize=(10, 10))
    
    # Draw quadrant boundaries
    plt.axvline(x=50, color='gray', linestyle='--', alpha=0.7)
    plt.axhline(y=50, color='gray', linestyle='--', alpha=0.7)
    
    # Plot Vehicles
    idle_x = [v.x for v in vehicles if v.status == "idle"]
    idle_y = [v.y for v in vehicles if v.status == "idle"]
    busy_x = [v.x for v in vehicles if v.status == "busy"]
    busy_y = [v.y for v in vehicles if v.status == "busy"]
    
    plt.scatter(idle_x, idle_y, color="green", marker="o", s=100, label="Idle Vehicle", edgecolor="black", zorder=3)
    plt.scatter(busy_x, busy_y, color="gray", marker="o", s=100, label="Busy Vehicle", edgecolor="black", zorder=3)
    
    # Plot Incidents
    unassigned_x, unassigned_y = [], []
    p1_x, p1_y = [], []
    p2_x, p2_y = [], []
    p3_x, p3_y = [], []
    
    for inc in incidents:
        if inc.response_time is None:
            unassigned_x.append(inc.x)
            unassigned_y.append(inc.y)
        elif inc.priority == 1:
            p1_x.append(inc.x)
            p1_y.append(inc.y)
        elif inc.priority == 2:
            p2_x.append(inc.x)
            p2_y.append(inc.y)
        elif inc.priority == 3:
            p3_x.append(inc.x)
            p3_y.append(inc.y)
            
    plt.scatter(p1_x, p1_y, color="yellow", marker="X", s=80, label="Priority 1 (Assigned)", edgecolor="black", zorder=4)
    plt.scatter(p2_x, p2_y, color="orange", marker="X", s=80, label="Priority 2 (Assigned)", edgecolor="black", zorder=4)
    plt.scatter(p3_x, p3_y, color="red", marker="X", s=80, label="Priority 3 (Assigned)", edgecolor="black", zorder=4)
    
    if unassigned_x:
        plt.scatter(unassigned_x, unassigned_y, color="black", marker="X", s=80, label="Unassigned", edgecolor="white", zorder=4)
    
    plt.xlim(0, 100)
    plt.ylim(0, 100)
    plt.xlabel("X Coordinate")
    plt.ylabel("Y Coordinate")
    plt.title("Final Simulation State")
    
    # Place legend slightly outside to avoid covering the grid
    plt.legend(loc="upper left", bbox_to_anchor=(1.02, 1))
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "grid_snapshot.png"), dpi=150)
    plt.close()

def plot_comparison(comparison_report_path: str, output_dir: str) -> None:
    """
    Reads a comparison JSON and plots a grouped bar chart comparing the
    Baseline and Advanced dispatchers across 3 key metrics.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    with open(comparison_report_path, "r") as f:
        data = json.load(f)
        
    metrics = [
        "priority_weighted_response_time", 
        "coverage_outage_minutes", 
        "priority_3_response_time"
    ]
    
    baseline_vals = [data["baseline"][m] for m in metrics]
    advanced_vals = [data["advanced"][m] for m in metrics]
    
    # Formatter for labels
    labels = ["Priority-Weighted\nResponse Time", "Coverage Outage\nMinutes", "Priority 3\nResponse Time"]
    
    x = np.arange(len(labels))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(10, 6))
    rects1 = ax.bar(x - width/2, baseline_vals, width, label='Baseline', color='lightcoral')
    rects2 = ax.bar(x + width/2, advanced_vals, width, label='Advanced (Reserve-Threshold)', color='mediumseagreen')
    
    ax.set_ylabel('Scores (Lower is Better)')
    ax.set_title('Baseline vs Advanced Dispatcher Comparison')
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend()
    
    # Add value labels on top of bars
    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.2f}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom')
                        
    autolabel(rects1)
    autolabel(rects2)
    
    fig.tight_layout()
    plt.savefig(os.path.join(output_dir, "comparison_chart.png"), dpi=150)
    plt.close(fig)
