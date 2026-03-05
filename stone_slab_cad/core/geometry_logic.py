"""
Core Geometric Logic for Stone Slab CAD.
Independent of Blender's bpy/bmesh for better testability and decoupling.
"""
from typing import Dict, List, Tuple, Any

def get_slab_edge_mapping() -> Dict[str, List[Tuple[int, int]]]:
    """
    Returns the mapping of edge names to vertex indices for a standard 8-vertex cube.
    Vertices:
    0: (-L/2, -H/2, -W/2)
    1: ( L/2, -H/2, -W/2)
    2: (-L/2,  H/2, -W/2)
    3: ( L/2,  H/2, -W/2)
    4: (-L/2, -H/2,  W/2)
    5: ( L/2, -H/2,  W/2)
    6: (-L/2,  H/2,  W/2)
    7: ( L/2,  H/2,  W/2)
    """
    return {
        'front': [(0, 1), (2, 3)],  # Anterior face edges (on the Z- axis in our coord system)
        'back':  [(4, 5), (6, 7)],  # Posterior face edges
        'left':  [(0, 4), (2, 6)],  # Port face edges
        'right': [(1, 5), (3, 7)]   # Starboard face edges
    }

def calculate_groove_parameters(length: float, width: float, height: float):
    """
    Calculates the positions and orientations for okapnik (drip) grooves.
    Returns a dictionary of groove data.
    """
    groove_width = 0.008   # 8mm
    groove_depth = 0.005   # 5mm  
    offset = 0.02          # 20mm from edge
    
    # (Location Offset, Is Vertical/Along-Width)
    # We use a tuple for the location Vector to avoid mathutils dependency in this logic layer
    return {
        'front': {
            'location': (0, -height/2 - groove_depth/2, width/2 - offset),
            'is_vertical': False,
            'length': length
        },
        'back': {
            'location': (0, -height/2 - groove_depth/2, -width/2 + offset),
            'is_vertical': False,
            'length': length
        },
        'left': {
            'location': (-length/2 + offset, -height/2 - groove_depth/2, 0),
            'is_vertical': True,
            'length': width
        },
        'right': {
            'location': (length/2 - offset, -height/2 - groove_depth/2, 0),
            'is_vertical': True,
            'length': width
        }
    }

def get_uv_projection_orientation(normal: Tuple[float, float, float]) -> str:
    """
    Determines the UV projection orientation based on face normal.
    """
    nx, ny, nz = normal
    if abs(nx) > 0.8: return 'YZ'
    if abs(ny) > 0.8: return 'XZ'
    return 'XY'
