"""
Edge profile library with comprehensive manufacturing specifications

This module now integrates with the edge_treatment_specs module
for advanced profile definitions including:
- C8 Chamfer (8.0mm depth at 45° angle)
- Full Round, Half Round, Quarter Round
- Ogee, Cove, Ovolo profiles
- CNC machining parameters
"""
from typing import Dict, Any, Optional

def get_profile_settings(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get bevel settings based on profile name.
    Enhanced to support comprehensive manufacturing specifications.
    """
    
    radius = profile.get('radius', 0)
    profile_name = profile.get('name', '').lower()
    
    # C8 Chamfer - 8.0mm depth at 45° angle
    if 'c8' in profile_name or 'chamfer 8' in profile_name:
        return {
            'radius': radius if radius > 0 else 8.0,
            'segments': 1,
            'profile_factor': 0.0,  # Sharp chamfer
            'profile_type': 'c8_chamfer',
            'angle': 45.0,
            'description': 'C8 Chamfer: 8.0mm depth at 45° inclusive angle'
        }
    
    # C5 Chamfer - 5.0mm depth
    if 'c5' in profile_name or 'chamfer 5' in profile_name:
        return {
            'radius': radius if radius > 0 else 5.0,
            'segments': 1,
            'profile_factor': 0.0,
            'profile_type': 'c5_chamfer',
            'angle': 45.0,
            'description': 'C5 Chamfer: 5.0mm depth at 45° angle'
        }
    
    # Full Round (Bullnose)
    if 'full' in profile_name and 'round' in profile_name:
        return {
            'radius': radius if radius > 0 else 20.0,
            'segments': 16,
            'profile_factor': 0.5,
            'profile_type': 'full_round',
            'description': 'Full Round (Bullnose) edge profile'
        }
    
    # Half Round (Demi-bullnose)
    if 'half' in profile_name and 'round' in profile_name or 'polu-zaobljena' in profile_name:
        return {
            'radius': radius if radius > 0 else 10.0,
            'segments': 12,
            'profile_factor': 0.5,
            'profile_type': 'half_round',
            'description': 'Half Round (Demi-bullnose) edge profile'
        }
    
    # Quarter Round
    if 'quarter' in profile_name and 'round' in profile_name:
        return {
            'radius': radius if radius > 0 else 6.0,
            'segments': 8,
            'profile_factor': 0.5,
            'profile_type': 'quarter_round',
            'description': 'Quarter Round edge profile'
        }
    
    # Ogee (S-curve)
    if 'ogee' in profile_name or 's-curve' in profile_name:
        return {
            'radius': radius if radius > 0 else 15.0,
            'segments': 20,
            'profile_factor': 0.7,
            'profile_type': 'ogee',
            'description': 'Ogee (S-curve) decorative profile'
        }
    
    # Cove (concave)
    if 'cove' in profile_name:
        return {
            'radius': radius if radius > 0 else 8.0,
            'segments': 10,
            'profile_factor': 1.0,  # Concave
            'profile_type': 'cove',
            'description': 'Cove (concave) edge profile'
        }
    
    # Ovolo
    if 'ovolo' in profile_name:
        return {
            'radius': radius if radius > 0 else 10.0,
            'segments': 12,
            'profile_factor': 0.6,
            'profile_type': 'ovolo',
            'description': 'Ovolo (quarter round with step) profile'
        }
    
    # Waterfall
    if 'waterfall' in profile_name:
        return {
            'radius': radius if radius > 0 else 25.0,
            'segments': 32,
            'profile_factor': 0.4,
            'profile_type': 'waterfall',
            'description': 'Waterfall cascading edge profile'
        }
    
    # Pencil edge
    if 'pencil' in profile_name:
        return {
            'radius': radius if radius > 0 else 3.0,
            'segments': 6,
            'profile_factor': 0.5,
            'profile_type': 'pencil',
            'description': 'Pencil edge (small radius) profile'
        }
    
    # Beveled edges at various angles
    if 'bevel' in profile_name:
        angle = 45.0
        if '30' in profile_name:
            angle = 30.0
        elif '60' in profile_name:
            angle = 60.0
        
        return {
            'radius': radius if radius > 0 else 8.0,
            'segments': 1,
            'profile_factor': 0.0,
            'profile_type': f'beveled_{int(angle)}',
            'angle': angle,
            'description': f'{angle}° Beveled edge profile'
        }
    
    # Default to C8 chamfer for standard manufacturing
    return {
        'radius': radius if radius > 0 else 8.0,
        'segments': 1,
        'profile_factor': 0.0,
        'profile_type': 'c8_chamfer',
        'angle': 45.0,
        'description': 'Default C8 Chamfer: 8.0mm depth at 45° angle'
    }


def get_profile_library() -> Dict[str, Dict[str, Any]]:
    """
    Get complete library of available edge profiles
    Returns dictionary of profile definitions
    """
    return {
        'c8_chamfer': {
            'name': 'C8 Chamfer',
            'depth_mm': 8.0,
            'angle_degrees': 45.0,
            'segments': 1,
            'profile_factor': 0.0,
            'description': 'Standard C8 chamfer: 8.0mm depth at 45° inclusive angle'
        },
        'c5_chamfer': {
            'name': 'C5 Chamfer',
            'depth_mm': 5.0,
            'angle_degrees': 45.0,
            'segments': 1,
            'profile_factor': 0.0
        },
        'c10_chamfer': {
            'name': 'C10 Chamfer',
            'depth_mm': 10.0,
            'angle_degrees': 45.0,
            'segments': 1,
            'profile_factor': 0.0
        },
        'full_round': {
            'name': 'Full Round (Bullnose)',
            'radius_mm': 20.0,
            'segments': 16,
            'profile_factor': 0.5
        },
        'half_round': {
            'name': 'Half Round (Demi-bullnose)',
            'radius_mm': 10.0,
            'segments': 12,
            'profile_factor': 0.5
        },
        'quarter_round': {
            'name': 'Quarter Round',
            'radius_mm': 6.0,
            'segments': 8,
            'profile_factor': 0.5
        },
        'ogee': {
            'name': 'Ogee (S-Curve)',
            'radius_mm': 15.0,
            'segments': 20,
            'profile_factor': 0.7
        },
        'cove': {
            'name': 'Cove',
            'radius_mm': 8.0,
            'segments': 10,
            'profile_factor': 1.0
        },
        'double_cove': {
            'name': 'Double Cove',
            'radius_mm': 12.0,
            'segments': 14,
            'profile_factor': 1.0
        },
        'ovolo': {
            'name': 'Ovolo',
            'radius_mm': 10.0,
            'depth_mm': 5.0,
            'segments': 12,
            'profile_factor': 0.6
        },
        'dupont': {
            'name': 'DuPont',
            'radius_mm': 18.0,
            'segments': 24,
            'profile_factor': 0.8
        },
        'waterfall': {
            'name': 'Waterfall',
            'radius_mm': 25.0,
            'depth_mm': 15.0,
            'segments': 32,
            'profile_factor': 0.4
        },
        'pencil': {
            'name': 'Pencil Edge',
            'radius_mm': 3.0,
            'segments': 6,
            'profile_factor': 0.5
        },
        'miter_45': {
            'name': '45° Miter',
            'depth_mm': 20.0,
            'angle_degrees': 45.0,
            'segments': 1,
            'profile_factor': 0.0
        },
        'stepped': {
            'name': 'Stepped',
            'depth_mm': 10.0,
            'segments': 3,
            'profile_factor': 0.0
        },
        'beveled_30': {
            'name': '30° Bevel',
            'depth_mm': 8.0,
            'angle_degrees': 30.0,
            'segments': 1,
            'profile_factor': 0.0
        },
        'beveled_60': {
            'name': '60° Bevel',
            'depth_mm': 12.0,
            'angle_degrees': 60.0,
            'segments': 1,
            'profile_factor': 0.0
        }
    }


def get_profile_names() -> list:
    """Get list of available profile names"""
    library = get_profile_library()
    return [info['name'] for info in library.values()]


def get_profile_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Get profile definition by display name"""
    library = get_profile_library()
    for key, info in library.items():
        if info['name'].lower() == name.lower():
            return info
    return None


__all__ = [
    'get_profile_settings',
    'get_profile_library',
    'get_profile_names',
    'get_profile_by_name'
] 
