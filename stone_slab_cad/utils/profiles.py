"""
Edge profile library
"""
from typing import Dict, Any

def get_profile_settings(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get bevel settings based on profile name.
    This can be extended with more complex profile logic.
    """
    
    radius = profile.get('radius', 0)
    
    # Simple example: "Polu-zaobljena" (Half-rounded) is a fillet (profile=0.5)
    if "Polu-zaobljena" in profile.get('name', ''):
        return {
            'radius': radius,
            'segments': 8,
            'profile_factor': 0.5
        }
    
    # Default to a simple chamfer if no specific profile is matched
    return {
        'radius': radius,
        'segments': 1,
        'profile_factor': 0.5  # Chamfer profile
    }
