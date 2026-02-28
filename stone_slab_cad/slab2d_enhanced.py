"""
Enhanced 2D Technical Drawing Generation
Creates professional technical drawings with dimensions for PDF export
"""
import svgwrite
import math
from typing import Dict, Any, List, Tuple

def generate_pdf_drawing_svg(config: Dict[Any, Any]) -> str:
    """
    Generate a comprehensive technical drawing SVG for PDF embedding.
    Returns the SVG as a string.
    """
    dims = config['dims']
    length, width, height = dims['length'], dims['width'], dims['height']
    
    # Create SVG with proper dimensions
    dwg = svgwrite.Drawing(size=('800px', '600px'), profile='full')
    
    # Define styles
    dwg.defs.add(dwg.style("""
        .title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #333; }
        .label { font-family: Arial, sans-serif; font-size: 10px; fill: #666; }
        .dimension { font-family: Arial, sans-serif; font-size: 11px; fill: #000; }
        .edge-processed { stroke: #2196F3; stroke-width: 3; fill: none; }
        .edge-normal { stroke: #333; stroke-width: 2; fill: none; }
        .okapnik { stroke: #FF9800; stroke-width: 4; fill: none; }
        .dimension-line { stroke: #666; stroke-width: 1; marker-end: url(#arrow); marker-start: url(#arrow); }
        .extension-line { stroke: #666; stroke-width: 0.5; }
        .hatch { fill: url(#hatchPattern); }
    """))
    
    # Define arrow markers
    marker = dwg.marker(insert=(10, 5), size=(10, 10), orient='auto')
    marker.add(dwg.path(d='M0,0 L10,5 L0,10 L2,5 Z', fill='#666'))
    dwg.defs.add(marker)
    
    # Define hatch pattern
    pattern = dwg.pattern(insert=(0, 0), size=(8, 8), patternUnits='userSpaceOnUse', patternTransform='rotate(45)')
    pattern.add(dwg.path(d='M0,0 L0,8', stroke='#999', stroke_width=0.5))
    dwg.defs.add(pattern)
    dwg.defs.add(dwg.pattern(id='hatchPattern', href=pattern))
    
    # Title
    dwg.add(dwg.text('Tehnički crtež', insert=(400, 30), class_='title', text_anchor='middle'))
    
    # Scale calculations
    margin = 100
    available_width = 700 - margin * 2
    available_height = 400
    
    scale_x = available_width / length
    scale_y = available_height / width
    scale = min(scale_x, scale_y) * 0.6
    
    # Center the drawing
    center_x = 400
    center_y = 250
    
    plan_width = length * scale
    plan_height = width * scale
    
    plan_x = center_x - plan_width / 2
    plan_y = center_y - plan_height / 2
    
    processed_edges = config.get('processedEdges', {})
    okapnik_edges = config.get('okapnikEdges', {})
    
    # Draw plan view (top view)
    # Main rectangle
    rect = dwg.rect(
        insert=(plan_x, plan_y),
        size=(plan_width, plan_height),
        class_='edge-normal'
    )
    dwg.add(rect)
    
    # Add hatching
    hatch = dwg.rect(
        insert=(plan_x, plan_y),
        size=(plan_width, plan_height),
        fill='url(#hatchPattern)',
        opacity=0.3
    )
