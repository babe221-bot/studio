# Material Sourcing & PBR Guide

This guide outlines how to add new stone materials to the Studio platform with professional-grade visualization.

## 1. Map Generation
For each material, you should ideally have four maps:
1.  **Albedo (Base Color):** High-resolution scan of the stone.
2.  **Roughness:** Gray-scale map where white is rough (matte) and black is shiny (polished).
3.  **Normal:** Purple-ish map containing surface detail.
4.  **Ambient Occlusion:** (Optional) Soft shadows in crevices.

### Recommended Tools
*   **Adobe Substance Sampler:** Excellent for converting single photos to full PBR sets.
*   **Polycam:** For scanning physical samples.
*   **Materialize (Open Source):** For manual map generation.

## 2. Texturing Protocol
*   **Tiling:** Maps should ideally be seamless.
*   **Resolution:** 2048x2048 (2K) is the sweet spot for web performance.
*   **Format:** JPG (80% quality) for Albedo/Roughness to save bandwidth; PNG for Normals.

## 3. Database Entry
Add the material to the Supabase `materials` table.

```json
{
  "name": "Bianco Carrara",
  "texture": "https://cdn.example.com/carrara_albedo.jpg",
  "roughness_map": "https://cdn.example.com/carrara_rough.jpg",
  "normal_map": "https://cdn.example.com/carrara_norm.jpg",
  "density": 2700,
  "cost_sqm": 120
}
```

## 4. UI Alignment (Grain Alignment)
Once added, users can use the **Grain Alignment Tool** in the configurator to:
*   Shift the starting point of the texture.
*   Rotate the "veins" to match the layout of other slabs in the project.
