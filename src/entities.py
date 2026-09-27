import math
from dataclasses import dataclass, field
from typing import Optional, Tuple

def get_quadrant(x: float, y: float) -> int:
    """
    Computes which of the 4 quadrants a point belongs to in a 100x100 grid.
    Quadrant 0 = (x < 50, y < 50)
    Quadrant 1 = (x >= 50, y < 50)
    Quadrant 2 = (x < 50, y >= 50)
    Quadrant 3 = (x >= 50, y >= 50)
    """
    if x < 50 and y < 50:
        return 0
    elif x >= 50 and y < 50:
        return 1
    elif x < 50 and y >= 50:
        return 2
    else:  # x >= 50 and y >= 50
        return 3

def euclidean_distance(pos1: Tuple[float, float], pos2: Tuple[float, float]) -> float:
    """
    Calculates the straight-line euclidean distance between two (x, y) points.
    """
    return math.hypot(pos1[0] - pos2[0], pos1[1] - pos2[1])

@dataclass
class Vehicle:
    """
    Represents an emergency vehicle in the simulation.
    """
    id: int
    x: float
    y: float
    status: str
    free_at_time: int = 0
    quadrant: int = field(init=False)

    def __post_init__(self):
        """Auto-computes the quadrant based on the vehicle's initial x, y position."""
        self.quadrant = get_quadrant(self.x, self.y)

@dataclass
class Incident:
    """
    Represents an emergency incident requiring a vehicle response.
    """
    id: int
    arrival_time: int
    x: float
    y: float
    priority: int
    assigned_time: Optional[int] = None
    assigned_vehicle_id: Optional[int] = None
    response_time: Optional[float] = None
