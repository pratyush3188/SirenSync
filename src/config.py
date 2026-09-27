"""
Configuration settings for the Emergency Fleet Assignment project.
"""

SEED = 99990007
GRID_SIZE = 100
NUM_VEHICLES = 20
NUM_INCIDENTS = 100
BUSY_DURATION = 8
SIM_MINUTES = 120
VEHICLE_SPEED = 3

PRIORITY_PROBS = {
    1: 0.60,
    2: 0.30,
    3: 0.10
}

PRIORITY_WEIGHTS = {
    1: 1,
    2: 3,
    3: 7
}
