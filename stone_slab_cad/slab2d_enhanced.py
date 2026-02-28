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
    dwg.add(hatch)
    
    # Draw processed edges (blue highlight)
    edge_offset = 2
    if processed_edges.get('front'):
        dwg.add(dwg.line(
            start=(plan_x + edge_offset, plan_y + edge_offset),
            end=(plan_x + plan_width - edge_offset, plan_y + edge_offset),
            class_='edge-processed'
        ))
    if processed_edges.get('back'):
        dwg.add(dwg.line(
            start=(plan_x + edge_offset, plan_y + plan_height - edge_offset),
            end=(plan_x + plan_width - edge_offset, plan_y + plan_height - edge_offset),
            class_='edge-processed'
        ))
    if processed_edges.get('left'):
        dwg.add(dwg.line(
            start=(plan_x + edge_offset, plan_y + edge_offset),
            end=(plan_x + edge_offset, plan_y + plan_height - edge_offset),
            class_='edge-processed'
        ))
    if processed_edges.get('right'):
        dwg.add(dwg.line(
            start=(plan_x + plan_width - edge_offset, plan_y + edge_offset),
            end=(plan_x + plan_width - edge_offset, plan_y + plan_height - edge_offset),
            class_='edge-processed'
        ))
    
    # Draw okapnik grooves (orange lines)
    groove_offset = 5
    groove_margin = 15
    if okapnik_edges.get('front'):
        dwg.add(dwg.line(
            start=(plan_x + groove_margin, plan_y + groove_offset),
            end=(plan_x + plan_width - groove_margin, plan_y + groove_offset),
            class_='okapnik'
        ))
    if okapnik_edges.get('back'):
        dwg.add(dwg.line(
            start=(plan_x + groove_margin, plan_y + plan_height - groove_offset),
            end=(plan_x + plan_width - groove_margin, plan_y + plan_height - groove_offset),
            class_='okapnik'
        ))
    
    # Dimension lines for length
    dim_offset = 30
    # Extension lines
    dwg.add(dwg.line(
        start=(plan_x, plan_y - dim_offset),
        end=(plan_x, plan_y - 10),
        class_='extension-line'
    ))
    dwg.add(dwg.line(
        start=(plan_x + plan_width, plan_y - dim_offset),
        end=(plan_x + plan_width, plan_y - 10),
        class_='extension-line'
    ))
    # Dimension line
    dwg.add(dwg.line(
        start=(plan_x, plan_y - dim_offset),
        end=(plan_x + plan_width, plan_y - dim_offset),
        class_='dimension-line'
    ))
    # Dimension text
    dwg.add(dwg.text(
        f'{length} mm',
        insert=(center_x, plan_y - dim_offset - 5),
        class_='dimension',
        text_anchor='middle'
    ))
    
    # Dimension lines for width
    dwg.add(dwg.line(
        start=(plan_x - dim_offset, plan_y),
        end=(plan_x - 10, plan_y),
        class_='extension-line'
    ))
    dwg.add(dwg.line(
        start=(plan_x - dim_offset, plan_y + plan_height),
        end=(plan_x - 10, plan_y + plan_height),
        class_='extension-line'
    ))
    dwg.add(dwg.line(
        start=(plan_x - dim_offset, plan_y),
        end=(plan_x - dim_offset, plan_y + plan_height),
        class_='dimension-line'
    ))
    dwg.add(dwg.text(
        f'{width} mm',
        insert=(plan_x - dim_offset - 5, center_y),
        class_='dimension',
        text_anchor='middle',
        transform=f'rotate(-90, {plan_x - dim_offset - 5}, {center_y})'
    ))
    
    # Add section view (side view)
    section_scale = scale * 2  # Exaggerate height for visibility
    section_width = width * scale
    section_height = height * section_scale
    section_x = 550
    section_y = 250
    
    dwg.add(dwg.text('Bočni pogled', insert=(section_x + section_width/2, 180), 
                     class_='label', text_anchor='middle'))
    
    # Section rectangle
    dwg.add(dwg.rect(
        insert=(section_x, section_y - section_height/2),
        size=(section_width, section_height),
        fill='url(#hatchPattern)',
        stroke='#333',
        stroke_width=2
    ))
    
    # Height dimension
    dwg.add(dwg.line(
        start=(section_x + section_width + 20, section_y - section_height/2),
        end=(section_x + section_width + 20, section_y + section_height/2),
        class_='dimension-line'
    ))
    dwg.add(dwg.text(
        f'{height} mm',
        insert=(section_x + section_width + 35, section_y),
        class_='dimension',
        text_anchor='middle',
        transform=f'rotate(-90, {section_x + section_width + 35}, {section_y})'
    ))
    
    # Add material info
    material = config.get('material', {})
    finish = config.get('finish', {})
    profile = config.get('profile', {})
    
    info_y = 480
    dwg.add(dwg.text(f"Materijal: {material.get('name', 'N/A')}", 
                     insert=(50, info_y), class_='label'))
    dwg.add(dwg.text(f"Obrada lica: {finish.get('name', 'N/A')}", 
                     insert=(50, info_y + 20), class_='label'))
    dwg.add(dwg.text(f"Profil: {profile.get('name', 'N/A')}", 
                     insert=(50, info_y + 40), class_='label'))
    dwg.add(dwg.text(f"Dimenzije: {length} × {width} × {height} mm", 
                     insert=(400, info_y), class_='label'))
    
    return dwg.tostring()


def generate_simple_drawing(config: Dict[Any, Any]) -> str:
    """
    Generate a simpler drawing for quick preview.
    Returns base64 encoded SVG.
    """
    import base64
    svg_string = generate_pdf_drawing_svg(config)
    return base64.b64encode(svg_string.encode('utf-8')).decode('utf-8')


if __name__ == '__main__':
    # Test
    test_config = {
        'dims': {'length': 600, 'width': 600, 'height': 30},
        'material': {'name': 'Carrara'},
        'finish': {'name': 'Polirano'},
        'profile': {'name': 'Polu-zaobljena R2cm'},
        'processedEdges': {'front': True, 'back': True, 'left': False, 'right': False},
        'okapnikEdges': {'front': True, 'back': False, 'left': False, 'right': False}
    }
    svg = generate_pdf_drawing_svg(test_config)
