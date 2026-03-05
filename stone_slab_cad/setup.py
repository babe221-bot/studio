from setuptools import setup, find_packages

setup(
    name="stone_slab_cad",
    version="0.1.0",
    description="CAD Engine for Stone Slab Processing",
    packages=find_packages(),
    # Also include top-level scripts if they are imported directly (like slab2d, slab3d)
    py_modules=["slab2d", "slab3d", "slab2d_enhanced", "cad_pipeline", "web_preview"],
    install_requires=[
        "ezdxf>=1.0.0",
        "drawsvg>=2.0.0",
        "Pillow>=9.0.0",
        # Note: bpy (Blender Python API) is often tricky to install via pip on all platforms.
        # It's listed here for completeness but might require manual environment setup.
    ],
    python_requires=">=3.9",
)