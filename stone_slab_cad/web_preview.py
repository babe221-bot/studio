"""
Local web preview server for generated assets
"""
import http.server
import socketserver
import webbrowser
import threading
import time
import os
from pathlib import Path

def create_preview_html(build_dir: str) -> str:
    """Create HTML preview page"""
    
    # Check what files are available
    build_path = Path(build_dir)
    has_glb = (build_path / 'slab.glb').exists()
    has_svg = (build_path / 'preview.svg').exists()
    has_dxf = (build_path / 'shop_drawing.dxf').exists()
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stone Slab Preview</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }}
        .content {{
            padding: 20px;
        }}
        .preview-section {{
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }}
        .section-header {{
            background: #34495e;
            color: white;
            padding: 15px;
            font-weight: bold;
        }}
        .section-content {{
            padding: 20px;
        }}
        .download-btn {{
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin: 5px;
        }}
        .download-btn:hover {{
            background: #2980b9;
        }}
        #viewer-3d {{
            width: 100%;
            height: 400px;
            border: 1px solid #ddd;
            background: #2a2a2a;
        }}
        .svg-preview {{
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
        }}
        .status {{
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }}
        .status.success {{ background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }}
        .status.warning {{ background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }}
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💎 Stone Slab CAD Preview</h1>
            <p>Generated assets ready for download and integration</p>
        </div>
        
        <div class="content">
            <!-- 3D Model Preview -->
            {'<div class="preview-section">' if has_glb else ''}
                {'<div class="section-header">3D Model Preview</div>' if has_glb else ''}
                {'<div class="section-content">' if has_glb else ''}
                    {'<div class="status success">✅ 3D model generated successfully</div>' if has_glb else ''}
                    {'<div id="viewer-3d"></div>' if has_glb else ''}
                    {'<div style="margin-top: 15px;">' if has_glb else ''}
                        {'<a href="slab.glb" class="download-btn" download>📥 Download GLB</a>' if has_glb else ''}
                    {'</div>' if has_glb else ''}
                {'</div>' if has_glb else ''}
            {'</div>' if has_glb else ''}
            
            <!-- 2D Drawing Preview -->
            {'<div class="preview-section">' if has_svg else ''}
                {'<div class="section-header">2D Technical Drawing</div>' if has_svg else ''}
                {'<div class="section-content">' if has_svg else ''}
                    {'<div class="status success">✅ Technical drawings generated successfully</div>' if has_svg else ''}
                    {'<object data="preview.svg" type="image/svg+xml" class="svg-preview"></object>' if has_svg else ''}
                    {'<div style="margin-top: 15px;">' if has_svg else ''}
                        {'<a href="shop_drawing.dxf" class="download-btn" download>📥 Download DXF</a>' if has_dxf else ''}
                        {'<a href="preview.svg" class="download-btn" download>📥 Download SVG</a>' if has_svg else ''}
                    {'</div>' if has_svg else ''}
                {'</div>' if has_svg else ''}
            {'</div>' if has_svg else ''}
            
            <!-- Integration Code -->
            <div class="preview-section">
                <div class="section-header">React Integration Code</div>
                <div class="section-content">
                    <div class="status success">✅ Ready for React Three Fiber integration</div>
                    <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;"><code>import {{ useGLTF }} from '@react-three/drei';

function SlabViewer() {{
  const {{ scene }} = useGLTF('/assets/slab.glb');
  return &lt;primitive object={{scene}} /&gt;;
}}</code></pre>
                </div>
            </div>
        </div>
    </div>
    <script>
        // Initialize 3D viewer if GLB is available
        {'''
        function init3DViewer() {
            const container = document.getElementById('viewer-3d');
            if (!container) return;
            
            // Scene setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x2a2a2a);
            
            const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);
            
            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
            directionalLight.position.set(5, 10, 7.5);
            scene.add(directionalLight);
            
            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight2.position.set(-5, -5, -5);
            scene.add(directionalLight2);
            
            // Controls
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            
            // Load GLB model
            const loader = new THREE.GLTFLoader();
            loader.load('slab.glb', function(gltf) {
                scene.add(gltf.scene);
                
                // Center camera on model
                const box = new THREE.Box3().setFromObject(gltf.scene);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3()).length();
                
                camera.position.set(center.x + size * 0.5, center.y + size * 0.6, center.z + size * 0.7);
                controls.target.copy(center);
                controls.update();
            }, undefined, function(error) {
                console.error('Error loading GLB:', error);
                container.innerHTML = '<div class="status warning">⚠  Could not load 3D model</div>';
            });
            
            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
            
            // Handle resize
            window.addEventListener('resize', function() {
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            });
        }
        
        // Initialize when page loads
        window.addEventListener('load', init3DViewer);
        ''' if has_glb else ''}
    </script>
</body>
</html>
    """
    
    return html_content

def launch_preview(build_dir: str, port: int = 8000) -> None:
    """Launch local preview server"""
    
    build_path = Path(build_dir).resolve()
    
    # Create preview HTML
    html_content = create_preview_html(str(build_path))
    preview_path = build_path / 'index.html'
    
    with open(preview_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    # Change to build directory
    original_cwd = os.getcwd()
    os.chdir(build_path)
    
    try:
        # Start server
        handler = http.server.SimpleHTTPRequestHandler
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"🚀 Preview server starting at http://localhost:{port}")
            
            # Open browser after short delay
            def open_browser():
                time.sleep(1)
                webbrowser.open(f'http://localhost:{port}')
            
            threading.Thread(target=open_browser, daemon=True).start()
            
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("
🛑 Preview server stopped")
    finally:
        os.chdir(original_cwd)
