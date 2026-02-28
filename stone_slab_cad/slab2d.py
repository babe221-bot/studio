"""
2D Technical Drawing Generation
Creates DXF files for manufacturing and SVG previews for web
"""
import ezdxf
import drawsvg
import math
from typing import Dict, Any

def generate_2d_drawings(config: Dict[Any, Any], dxf_path: str, svg_path: str) -> None:
    """Generate both DXF technical drawings and SVG preview"""
    
    # Extract dimensions
    dims = config['dims']
    length = dims['length']  # Keep in mm for technical drawings
    width = dims['width']
    height = dims['height']
    
    print(f"Creating 2D drawings: {length}x{width}x{height}mm")
    
    # Generate DXF technical drawing
    generate_dxf_drawing(config, dxf_path)
    
    # Generate SVG preview
    generate_svg_preview(config, svg_path)

def generate_dxf_drawing(config: Dict[Any, Any], output_path: str) -> None:
    """Create professional DXF technical drawing"""
    
    # Create new DXF document
    doc = ezdxf.new('R2010')  # AutoCAD 2010 format for compatibility
    msp = doc.modelspace()
    
    dims = config['dims']
    length, width, height = dims['length'], dims['width'], dims['height']
    
    # Set up layers
    doc.layers.new('OUTLINE', dxfattribs={'color': 7})      # White outline
    doc.layers.new('DIMENSIONS', dxfattribs={'color': 3})   # Green dimensions  
    doc.layers.new('CENTERLINES', dxfattribs={'color': 5})  # Blue centerlines
    doc.layers.new('HATCHING', dxfattribs={'color': 8})     # Gray hatching
    doc.layers.new('TEXT', dxfattribs={'color': 2})         # Yellow text
    
    # Plan view (top view)
    plan_origin = (0, 0)
    
    # Main outline
    plan_points = [
        plan_origin,
        (plan_origin[0] + length, plan_origin[1]),
        (plan_origin[0] + length, plan_origin[1] + width),
        (plan_origin[0], plan_origin[1] + width)
    ]
    
    msp.add_lwpolyline(
        plan_points,
        close=True,
        dxfattribs={'layer': 'OUTLINE'}
    )
    
    # Add centerlines
    msp.add_line(
        (plan_origin[0] - 50, plan_origin[1] + width/2),
        (plan_origin[0] + length + 50, plan_origin[1] + width/2),
        dxfattribs={'layer': 'CENTERLINES', 'linetype': 'CENTER'}
    )
    
    msp.add_line(
        (plan_origin[0] + length/2, plan_origin[1] - 50),
        (plan_origin[0] + length/2, plan_origin[1] + width + 50),
        dxfattribs={'layer': 'CENTERLINES', 'linetype': 'CENTER'}
    )
    
    # Plan view dimensions
    dim_offset = 100
    
    # Length dimension
    dim = msp.add_linear_dim(
        base=(plan_origin[0], plan_origin[1] - dim_offset),
        p1=plan_origin,
        p2=(plan_origin[0] + length, plan_origin[1]),
        dxfattribs={'layer': 'DIMENSIONS'}
    )
    dim.render()
    
    # Width dimension  
    dim = msp.add_linear_dim(
        base=(plan_origin[0] - dim_offset, plan_origin[1]),
        p1=plan_origin,
        p2=(plan_origin[0], plan_origin[1] + width),
        dxfattribs={'layer': 'DIMENSIONS'}
    )
    dim.render()
    
    # Section view (side view)
    section_origin = (length + 200, 0)
    
    # Section outline
    section_points = [
        section_origin,
        (section_origin[0] + width, section_origin[1]),
        (section_origin[0] + width, section_origin[1] + height),
        (section_origin[0], section_origin[1] + height)
    ]
    
    msp.add_lwpolyline(
        section_points,
        close=True,
        dxfattribs={'layer': 'OUTLINE'}
    )
    
    # Section hatching (stone pattern)
    hatch = msp.add_hatch(color=8, dxfattribs={'layer': 'HATCHING'})
    hatch.paths.add_polyline_path(section_points, is_closed=True)
    hatch.set_pattern_fill('ANSI31', scale=10)
    
    # Height dimension
    dim = msp.add_linear_dim(
        base=(section_origin[0] + width + 50, section_origin[1]),
        p1=section_origin,
        p2=(section_origin[0], section_origin[1] + height),
        dxfattribs={'layer': 'DIMENSIONS'}
    )
    dim.render()
    
    # Add okapnik grooves if specified
    groove_width = 8   # 8mm
    groove_depth = 5   # 5mm
    edge_offset = 20   # 20mm from edge
    
    if config['okapnikEdges'].get('front'):
        groove_y = plan_origin[1] + width - edge_offset
        msp.add_line(
            (plan_origin[0], groove_y),
            (plan_origin[0] + length, groove_y),
            dxfattribs={'layer': 'OUTLINE', 'lineweight': 50}
        )
    
    if config['okapnikEdges'].get('back'):
        groove_y = plan_origin[1] + edge_offset  
        msp.add_line(
            (plan_origin[0], groove_y),
            (plan_origin[0] + length, groove_y),
            dxfattribs={'layer': 'OUTLINE', 'lineweight': 50}
        )
    
    # Add title block
    title_origin = (0, -300)
    add_title_block(msp, title_origin, config)
    
    # Save DXF file
    doc.saveas(output_path)
    print(f"DXF drawing saved: {output_path}")

def generate_svg_preview(config: Dict[Any, Any], output_path: str) -> None:
    """Create SVG preview for web display"""
    
    dims = config['dims']
    length, width, height = dims['length'], dims['width'], dims['height']
    
    # Scale for reasonable SVG size
    scale = min(400 / max(length, width), 300 / height)
    
    svg_width = int(length * scale + 100)
    svg_height = int(width * scale + height * scale + 150)
    
    # Create SVG drawing
    drawing = drawsvg.Drawing(svg_width, svg_height, origin='top-left')
    
    # Plan view
    plan_x, plan_y = 50, 50
    plan_w, plan_h = length * scale, width * scale
    
    drawing.append(drawsvg.Rectangle(
        plan_x, plan_y, plan_w, plan_h,
        stroke='black', stroke_width=2, fill='lightgray', fill_opacity=0.3
    ))
    
    # Section view
    section_x = plan_x
    section_y = plan_y + plan_h + 50
    section_w, section_h = width * scale, height * scale
    
    drawing.append(drawsvg.Rectangle(
        section_x, section_y, section_w, section_h,
        stroke='black', stroke_width=2, fill='darkgray', fill_opacity=0.5
    ))
    
    # Add dimensions as text
    drawing.append(drawsvg.Text(
        f'{length}mm', 12, plan_x + plan_w/2, plan_y - 10,
        text_anchor='middle', font_family='Arial'
    ))
    
    drawing.append(drawsvg.Text(
        f'{width}mm', 12, plan_x - 30, plan_y + plan_h/2,
        text_anchor='middle', font_family='Arial', transform=f'rotate(-90, {plan_x-30}, {plan_y + plan_h/2})'
    ))
    
    drawing.append(drawsvg.Text(
        f'{height}mm', 12, section_x + section_w + 20, section_y + section_h/2,
        text_anchor='middle', font_family='Arial', transform=f'rotate(-90, {section_x + section_w + 20}, {section_y + section_h/2})'
    ))
    
    # Add title
    drawing.append(drawsvg.Text(
        f"Stone Slab - {config['material']['name']}", 16,
        svg_width/2, 25, text_anchor='middle', font_family='Arial', font_weight='bold'
    ))
    
    # Save SVG
    drawing.save_svg(output_path)
    print(f"SVG preview saved: {output_path}")

def add_title_block(msp, origin, config):
    """Add professional title block to DXF"""
    
    x, y = origin
    block_width, block_height = 400, 150
    
    # Title block outline
    msp.add_lwpolyline([
        (x, y),
        (x + block_width, y),
        (x + block_width, y + block_height),
        (x, y + block_height)
    ], close=True, dxfattribs={'layer': 'OUTLINE'})
    
    # Add text information
    text_attrs = {'layer': 'TEXT', 'height': 8}
    
    msp.add_text(f"MATERIAL: {config['material']['name']}",
                dxfattribs={**text_attrs, 'insert': (x + 10, y + 120)})

    
    msp.add_text(f"FINISH: {config['finish']['name']}",
                dxfattribs={**text_attrs, 'insert': (x + 10, y + 100)})

    
    msp.add_text(f"PROFILE: {config['profile']['name']}",
                dxfattribs={**text_attrs, 'insert': (x + 10, y + 80)})

    
    # Dimensions summary
    dims = config['dims']
    msp.add_text(f"DIMENSIONS: {dims['length']} × {dims['width']} × {dims['height']} mm",
                dxfattribs={**text_attrs, 'height': 10, 'insert': (x + 10, y + 50)})

