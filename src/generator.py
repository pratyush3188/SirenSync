"""
Scenario generator for the Emergency Fleet Assignment simulation.
"""
import numpy as np
from typing import List, Tuple
from src import config
from src.entities import Vehicle, Incident

def generate_scenario() -> Tuple[List[Vehicle], List[Incident]]:
    """
    Generates the vehicles and incidents for the simulation scenario.
    
    CRITICAL GENERATION ORDER FOR REPRODUCIBILITY:
    1. Vehicles (IDs 0-19): Generated quadrant by quadrant [0, 1, 2, 3].
       5 vehicles per quadrant. For each vehicle, X is generated, then Y.
    2. Incidents (IDs 0-99): Generated sequentially. For each incident,
       we generate in exact order: arrival_time, x, y, priority.
    
    This exact sequence must be followed to ensure the RNG state is consumed 
    identically across all evaluation runs.
    """
    # Initialize the specific generator as requested
    rng = np.random.Generator(np.random.PCG64(config.SEED))
    
    vehicles = []
    
    # Step 1: Generate 20 Vehicles (5 per quadrant)
    # Bounds defined as (x_low, x_high, y_low, y_high)
    quadrant_bounds = [
        (0, 50, 0, 50),     # Quadrant 0: x in [0,50), y in [0,50)
        (50, 100, 0, 50),   # Quadrant 1: x in [50,100), y in [0,50)
        (0, 50, 50, 100),   # Quadrant 2: x in [0,50), y in [50,100)
        (50, 100, 50, 100)  # Quadrant 3: x in [50,100), y in [50,100)
    ]
    
    vehicle_id = 0
    vehicles_per_quadrant = config.NUM_VEHICLES // 4
    
    for bounds in quadrant_bounds:
        x_low, x_high, y_low, y_high = bounds
        for _ in range(vehicles_per_quadrant):
            x = float(rng.uniform(x_low, x_high))
            y = float(rng.uniform(y_low, y_high))
            vehicles.append(
                Vehicle(
                    id=vehicle_id,
                    x=x,
                    y=y,
                    status="idle",
                    free_at_time=0
                )
            )
            vehicle_id += 1
            
    # Step 2: Generate 100 Incidents
    incidents = []
    priority_choices = [1, 2, 3]
    priority_weights = [config.PRIORITY_PROBS[1], config.PRIORITY_PROBS[2], config.PRIORITY_PROBS[3]]
    
    for inc_id in range(config.NUM_INCIDENTS):
        # rng.integers(0, 60) generates integers in [0, 59] (high is exclusive in numpy)
        arrival_time = int(rng.integers(0, 60))
        x = float(rng.uniform(0, config.GRID_SIZE))
        y = float(rng.uniform(0, config.GRID_SIZE))
        priority = int(rng.choice(priority_choices, p=priority_weights))
        
        incidents.append(
            Incident(
                id=inc_id,
                arrival_time=arrival_time,
                x=x,
                y=y,
                priority=priority
            )
        )
        
    return vehicles, incidents
