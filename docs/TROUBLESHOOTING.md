# Troubleshooting FAQ

### 1. "Why is my 3D render taking so long?"
Photorealistic renders are generated headlessly using Blender's Cycles engine.
*   **Cause:** Rendering requires intense ray-tracing calculations.
*   **Fix:** Ensure the backend has enough RAM (>4GB) and if possible, a GPU-enabled worker.

### 2. "The 3D model looks blurry on mobile."
*   **Cause:** Textures are optimized for bandwidth.
*   **Fix:** Check your network connection. If using AR mode, wait a few seconds for the full-resolution GLB to download.

### 3. "Voice commands are not working."
*   **Cause:** Browser permissions or unsupported browser.
*   **Fix:** Voice commands require Chrome or Edge on Desktop/Android. Ensure you've clicked "Allow Microphone" and the pulse icon is active.

### 4. "My design wasn't saved."
*   **Cause:** Project history depends on LocalStorage and Supabase Auth.
*   **Fix:** Sign in to sync designs across devices. Guest sessions are persistent on a single browser but not transferable.
