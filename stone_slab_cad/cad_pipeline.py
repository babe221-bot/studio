#!/usr/bin/env python3
"""
Stone Slab CAD Pipeline - Main CLI Application
Generates 3D models and 2D technical drawings from JSON configuration
"""
import json
import pathlib
import sys
import argparse
import subprocess
from typing import Dict, Any

def setup_blender_environment():
    """Ensure Blender Python API is properly configured"""
    try:
        import bpy
        return True
    except ImportError:
        print("❌ Blender Python API not found. Install with:")
        print("   pip install bpy==4.1.0")
        return False

def validate_config(cfg: Dict[Any, Any]) -> bool:
    """Validate configuration parameters"""
    required_keys = ['dims', 'material', 'finish', 'profile', 'processedEdges', 'okapnikEdges']
    
    for key in required_keys:
        if key not in cfg:
            print(f"❌ Missing required key: {key}")
            return False
    
    # Validate dimensions
    dims = cfg['dims']
    if not all(k in dims for k in ['length', 'width', 'height']):
        print("❌ Invalid dimensions format")
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(
        description="Stone Slab CAD Pipeline - Generate 3D models and 2D drawings"
    )
    parser.add_argument('--params', required=True, help='Path to parameters JSON file')
    parser.add_argument('--out', default='build', help='Output directory')
    parser.add_argument('--preview', action='store_true', help='Launch web preview after generation')
    parser.add_argument('--2d-only', action='store_true', help='Generate only 2D drawings')
    
    args = parser.parse_args()
    
    # Load and validate configuration
    try:
        with open(args.params, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
    except FileNotFoundError:
        print(f"❌ Configuration file not found: {args.params}")
        return 1
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in configuration file: {e}")
        return 1
    
    if not validate_config(cfg):
        return 1
    
    # Setup output directory
    output_dir = pathlib.Path(args.out).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"⏳ Processing slab configuration...")
    print(f"   Dimensions: {cfg['dims']['length']}×{cfg['dims']['width']}×{cfg['dims']['height']}mm")
    print(f"   Material: {cfg['material']['name']}")
    print(f"   Output: {output_dir}")
    
    # Generate 2D drawings (always fast)
    from slab2d import generate_2d_drawings
    try:
        dxf_path = output_dir / 'shop_drawing.dxf'
        svg_path = output_dir / 'preview.svg'
        generate_2d_drawings(cfg, str(dxf_path), str(svg_path))
        print(f"✅ 2D drawings generated: {dxf_path}, {svg_path}")
    except Exception as e:
        print(f"❌ 2D generation failed: {e}")
        return 1
    
    # Generate 3D model (unless 2D-only mode)
    if not args.only_2d:
        if not setup_blender_environment():
            return 1
        
        from slab3d import generate_3d_model
        try:
            glb_path = output_dir / 'slab.glb'
            generate_3d_model(cfg, str(glb_path))
            print(f"✅ 3D model generated: {glb_path}")
        except Exception as e:
            print(f"❌ 3D generation failed: {e}")
            return 1
    
    # Launch preview if requested
    if args.preview:
        from web_preview import launch_preview
        launch_preview(str(output_dir))
    
    print(f"🎉 Pipeline completed successfully!")
    return 0

if __name__ == '__main__':
    sys.exit(main())
