# Extended Material Library for Stone Slab Configurator

**Domain:** 3D Product Configuration System  
**Researched:** 2026-03-10  
**Overall Confidence:** HIGH

## Executive Summary

This research outlines the implementation of an extended material library for the Next.js + FastAPI stone slab configurator. The current system supports basic PBR materials with a limited preset database. The extended library will support multiple stone types (granite, marble, quartz, limestone, travertine, etc.), custom texture uploads with normal/displacement/roughness maps, material categorization, search/filtering, pricing integration, texture compression, preview generation, and user favorites/presets.

The recommended architecture leverages **Supabase** for database and storage (already in the tech stack), **FastAPI** for CRUD operations and business logic, and **React Three Fiber** with extended material support for the frontend. Texture optimization uses **KTX2/Basis Universal** compression for GPU-efficient rendering, with a tiered preview generation system (thumbnail, swatch, full-resolution).

---

## 1. Stone Types and Material Categories

### 1.1 Extended Stone Type Taxonomy

The material library should support the following stone categories with subtypes:

| Category      | Stone Types                                                   | Characteristics                            | Typical Finishes            |
| ------------- | ------------------------------------------------------------- | ------------------------------------------ | --------------------------- |
| **Marble**    | Carrara, Calacatta, Nero Marquina, Emperador, Verde Guatemala | Veined, translucent, luxury appearance     | Polished, Honed, Leather    |
| **Granite**   | Black Galaxy, Absolute Black, Kashmir White, Santa Cecilia    | Dense, durable, speckled pattern           | Polished, Flamed, Brushed   |
| **Quartz**    | Pure White, Carrara, Calacatta Gold, Nero Marquina            | Engineered, consistent pattern, non-porous | Polished, Concrete, Leather |
| **Limestone** | Jerusalem, Travertine, crema marfil                           | Soft, porous, earthy tones                 | Honed, Tumbled, Brushed     |
| **Slate**     | Black, Multi-color, Green                                     | Layered, natural cleft, rustic             | Natural Cleft, Honed        |
| **Soapstone** | Grey, Black, Green                                            | Soft, talc-based, heat-resistant           | Oiled, Untreated            |
| **Onyx**      | Honey, Green, Black                                           | Translucent, dramatic veining              | Polished                    |
| **Porcelain** | Marble-look, Stone-look, Concrete-look                        | Thin, lightweight, durable                 | Polished, Matte             |

### 1.2 Material Properties Schema

Each stone type requires the following properties:

```typescript
interface StoneMaterial {
  // Identification
  id: string;
  name: string;
  displayName: string;
  category: StoneCategory;
  subcategory?: string;
  supplier?: string;
  supplierSku?: string;

  // Physical Properties
  density: number; // g/cm³
  porosity: number; // percentage
  waterAbsorption: number; // percentage
  compressiveStrength: number; // MPa
  flexuralStrength: number; // MPa
  abrasionResistance: number; // hardness index

  // Visual Properties
  baseColor: string; // HEX
  patternType: 'veined' | 'speckled' | 'solid' | 'marbled' | 'layered';
  patternScale: 'small' | 'medium' | 'large';
  patternIntensity: number; // 0-1

  // PBR Properties
  roughness: number; // 0-1 (default per finish)
  metallic: number; // 0-1 (typically 0 for stone)
  normalStrength: number; // 0-1
  displacementScale: number; // meters
  clearcoat: number; // 0-1 (for polished)
  subsurfaceScattering: number; // 0-1

  // Pricing
  basePriceSqm: number; // EUR
  priceTier: 'budget' | 'standard' | 'premium' | 'luxury';
  pricePerThickness: Record<number, number>; // { 20: 100, 30: 150 }

  // Metadata
  origin: string; // country/region
  availability: 'in_stock' | 'limited' | 'special_order';
  leadTimeDays: number;
  tags: string[];
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type StoneCategory =
  | 'marble'
  | 'granite'
  | 'quartz'
  | 'limestone'
  | 'slate'
  | 'soapstone'
  | 'onyx'
  | 'porcelain';
```

### 1.3 Surface Finishes

| Finish       | Roughness | Clearcoat | Use Case                     |
| ------------ | --------- | --------- | ---------------------------- |
| Polished     | 0.08-0.15 | 0.2-0.3   | High-end kitchens, bathrooms |
| Honed        | 0.35-0.45 | 0.0       | Matte, natural look          |
| Leather      | 0.55-0.65 | 0.0       | Textured, grippy feel        |
| Flamed       | 0.75-0.85 | 0.0       | Anti-slip, outdoor           |
| Brushed      | 0.25-0.35 | 0.05      | Subtle texture               |
| Bushhammered | 0.70-0.90 | 0.0       | Heavy anti-slip              |

---

## 2. Custom Texture Upload System

### 2.1 Supported Texture Types

The system should support uploading the following texture maps:

| Map Type                | Format   | Resolution             | Color Space | Purpose                      |
| ----------------------- | -------- | ---------------------- | ----------- | ---------------------------- |
| **Albedo/Base Color**   | PNG, JPG | 1024x1024 to 4096x4096 | sRGB        | Base color without lighting  |
| **Normal Map**          | PNG      | 1024x1024 to 4096x4096 | Non-Color   | Surface bumps/indentations   |
| **Roughness Map**       | PNG, JPG | 1024x1024 to 4096x4096 | Non-Color   | Surface gloss variation      |
| **Displacement/Height** | PNG, EXR | 1024x1024 to 4096x4096 | Non-Color   | Actual geometry displacement |
| **Ambient Occlusion**   | PNG, JPG | 1024x1024 to 4096x4096 | Non-Color   | Corner shadowing             |
| **Metallic Map**        | PNG, JPG | 1024x1024 to 4096x4096 | Non-Color   | Metal areas (rare for stone) |

### 2.2 Upload Workflow

```typescript
interface TextureUploadRequest {
  materialId: string;
  textureType: TextureType;
  file: File;
  tiling: { x: number; y: number };
  offset: { x: number; y: number };
  rotation: number;
}

type TextureType =
  | 'albedo'
  | 'normal'
  | 'roughness'
  | 'displacement'
  | 'ao'
  | 'metallic';

// Frontend upload component
async function uploadTexture(request: TextureUploadRequest) {
  const formData = new FormData();
  formData.append('file', request.file);
  formData.append('material_id', request.materialId);
  formData.append('texture_type', request.textureType);
  formData.append('tiling_x', request.tiling.x.toString());
  formData.append('tiling_y', request.tiling.y.toString());

  const response = await fetch('/api/materials/textures', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

### 2.3 Texture Validation Rules

```typescript
const TEXTURE_CONSTRAINTS = {
  albedo: {
    maxSize: 10 * 1024 * 1024, // 10MB
    minResolution: 1024,
    maxResolution: 4096,
    formats: ['image/png', 'image/jpeg'],
    colorSpace: 'sRGB',
  },
  normal: {
    maxSize: 10 * 1024 * 1024,
    minResolution: 1024,
    maxResolution: 4096,
    formats: ['image/png'],
    colorSpace: 'Non-Color',
  },
  roughness: {
    maxSize: 5 * 1024 * 1024, // 5MB
    minResolution: 512,
    maxResolution: 2048,
    formats: ['image/png', 'image/jpeg'],
    colorSpace: 'Non-Color',
  },
  displacement: {
    maxSize: 20 * 1024 * 1024, // 20MB (often EXR)
    minResolution: 1024,
    maxResolution: 4096,
    formats: ['image/png', 'image/exr'],
    colorSpace: 'Non-Color',
  },
};

function validateTexture(file: File, type: TextureType): ValidationResult {
  const constraints = TEXTURE_CONSTRAINTS[type];

  if (!constraints.formats.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid format. Supported: ${constraints.formats.join(', ')}`,
    };
  }

  // Check dimensions by loading image
  const img = new Image();
  img.src = URL.createObjectURL(file);

  return new Promise((resolve) => {
    img.onload = () => {
      const { width, height } = img;
      if (
        width < constraints.minResolution ||
        height < constraints.minResolution
      ) {
        resolve({
          valid: false,
          error: `Resolution too low. Minimum: ${constraints.minResolution}px`,
        });
      }
      if (
        width > constraints.maxResolution ||
        height > constraints.maxResolution
      ) {
        resolve({
          valid: false,
          error: `Resolution too high. Maximum: ${constraints.maxResolution}px`,
        });
      }
      resolve({ valid: true });
    };
  });
}
```

---

## 3. Database Schema

### 3.1 Supabase Database Tables

```sql
-- Material Categories
CREATE TABLE material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stone Materials
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category_id UUID REFERENCES material_categories(id),
  subcategory TEXT,

  -- Physical Properties
  density DECIMAL(5,2),           -- g/cm³
  porosity DECIMAL(4,2),           -- percentage
  water_absorption DECIMAL(4,2),   -- percentage
  compressive_strength DECIMAL(7,2),  -- MPa
  flexural_strength DECIMAL(6,2),  -- MPa

  -- Visual Properties
  base_color TEXT,                 -- HEX
  pattern_type TEXT CHECK (pattern_type IN ('veined', 'speckled', 'solid', 'marbled', 'layered')),
  pattern_scale TEXT CHECK (pattern_scale IN ('small', 'medium', 'large')),
  pattern_intensity DECIMAL(3,2) DEFAULT 0.5,

  -- PBR Properties (JSON for flexibility)
  pbr_properties JSONB DEFAULT '{}',

  -- Pricing
  base_price_sqm DECIMAL(10,2) NOT NULL,
  price_tier TEXT CHECK (price_tier IN ('budget', 'standard', 'premium', 'luxury')) DEFAULT 'standard',
  price_per_thickness JSONB DEFAULT '{}',  -- { "20": 100, "30": 150 }

  -- Sourcing
  supplier TEXT,
  supplier_sku TEXT,
  origin TEXT,
  availability TEXT CHECK (availability IN ('in_stock', 'limited', 'special_order')) DEFAULT 'in_stock',
  lead_time_days INTEGER DEFAULT 7,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Texture Maps
CREATE TABLE material_textures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  texture_type TEXT NOT NULL CHECK (texture_type IN ('albedo', 'normal', 'roughness', 'displacement', 'ao', 'metallic')),

  -- Storage
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,

  -- Transform
  tiling_x DECIMAL(5,2) DEFAULT 1.0,
  tiling_y DECIMAL(5,2) DEFAULT 1.0,
  offset_x DECIMAL(5,2) DEFAULT 0.0,
  offset_y DECIMAL(5,2) DEFAULT 0.0,
  rotation DECIMAL(5,2) DEFAULT 0.0,

  -- Compression
  is_compressed BOOLEAN DEFAULT false,
  compression_format TEXT,  -- 'ktx2', 'basis'
  original_texture_id UUID REFERENCES material_textures(id),

  -- Preview
  has_preview BOOLEAN DEFAULT false,
  preview_path TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Surface Finishes
CREATE TABLE surface_finishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Visual Properties
  roughness_min DECIMAL(3,2) DEFAULT 0.0,
  roughness_max DECIMAL(3,2) DEFAULT 1.0,
  roughness_default DECIMAL(3,2) DEFAULT 0.5,
  clearcoat DECIMAL(3,2) DEFAULT 0.0,

  -- Pricing
  price_modifier DECIMAL(4,2) DEFAULT 1.0,  -- multiplier
  price_per_sqm DECIMAL(10,2),  -- flat fee

  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Favorites
CREATE TABLE user_material_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, material_id)
);

-- User Material Presets
CREATE TABLE user_material_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  finish_id UUID REFERENCES surface_finishes(id) ON DELETE SET NULL,

  -- Custom Texture Overrides
  custom_textures JSONB DEFAULT '{}',

  -- Pricing Overrides
  custom_price DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material Reviews/Ratings
CREATE TABLE material_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[],  -- paths to user-uploaded images
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE surface_finishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_material_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_material_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Materials are viewable by all" ON materials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their favorites" ON user_material_favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their presets" ON user_material_presets
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_price_tier ON materials(price_tier);
CREATE INDEX idx_materials_slug ON materials(slug);
CREATE INDEX idx_materials_featured ON materials(is_featured) WHERE is_featured = true;
CREATE INDEX idx_materials_tags ON materials USING GIN(tags);
CREATE INDEX idx_material_textures_material ON material_textures(material_id);
CREATE INDEX idx_material_textures_type ON material_textures(texture_type);
CREATE INDEX idx_user_favorites_user ON user_material_favorites(user_id);
CREATE INDEX idx_user_presets_user ON user_material_presets(user_id);
```

### 3.2 Supabase Storage Buckets

```sql
-- Create storage buckets for textures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('material-textures', 'material-textures', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/exr']),
  ('material-previews', 'material-previews', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('user-uploads', 'user-uploads', true, 104857600, ARRAY['image/png', 'image/jpeg', 'image/webp']);

-- Storage policies
CREATE POLICY "Public read access to material textures" ON storage.objects
  FOR SELECT USING (bucket_id IN ('material-textures', 'material-previews'));

CREATE POLICY "Authenticated users can upload textures" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-uploads' AND auth.role() = 'authenticated');
```

---

## 4. API Endpoints

### 4.1 Materials CRUD

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/materials", tags=["materials"])

# Request/Response Models
class MaterialBase(BaseModel):
    name: str
    display_name: str
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    density: Optional[float] = None
    base_color: Optional[str] = None
    pattern_type: Optional[str] = None
    base_price_sqm: float
    price_tier: str = "standard"
    tags: List[str] = []

class MaterialCreate(MaterialBase):
    pbr_properties: Optional[dict] = None
    price_per_thickness: Optional[dict] = None

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    category_id: Optional[str] = None
    pbr_properties: Optional[dict] = None
    base_price_sqm: Optional[float] = None
    tags: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class MaterialResponse(MaterialBase):
    id: str
    slug: str
    pbr_properties: dict = {}
    price_per_thickness: dict = {}
    availability: str
    is_featured: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Endpoints
@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    category: Optional[str] = Query(None),
    price_tier: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    featured: bool = Query(False),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """List materials with filtering and search"""
    query = db.query(Material).filter(Material.is_active == True)

    if category:
        query = query.filter(Material.category_id == category)
    if price_tier:
        query = query.filter(Material.price_tier == price_tier)
    if featured:
        query = query.filter(Material.is_featured == True)
    if search:
        query = query.filter(
            or_(
                Material.name.ilike(f"%{search}%"),
                Material.display_name.ilike(f"%{search}%"),
                Material.tags.contains([search])
            )
        )

    return query.offset(offset).limit(limit).all()

@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(material_id: str):
    """Get single material by ID"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.post("", response_model=MaterialResponse, status_code=201)
async def create_material(
    material: MaterialCreate,
    current_user = Depends(get_admin_user)
):
    """Create new material (admin only)"""
    # Generate slug
    slug = slugify(material.name)

    # Check for duplicate
    existing = db.query(Material).filter(Material.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material with this name already exists")

    db_material = Material(
        **material.model_dump(),
        slug=slug,
        created_by=current_user.id
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)

    return db_material

@router.patch("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    updates: MaterialUpdate,
    current_user = Depends(get_admin_user)
):
    """Update material (admin only)"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(material, key, value)

    material.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(material)

    return material

@router.delete("/{material_id}", status_code=204)
async def delete_material(
    material_id: str,
    current_user = Depends(get_admin_user)
):
    """Soft-delete material (admin only)"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    material.is_active = False
    material.updated_at = datetime.utcnow()
    db.commit()
```

### 4.2 Texture Management

```python
@router.post("/textures")
async def upload_texture(
    material_id: str = Form(...),
    texture_type: str = Form(...),
    file: UploadFile = File(...),
    tiling_x: float = Form(1.0),
    tiling_y: float = Form(1.0),
    current_user = Depends(get_admin_user)
):
    """Upload texture for a material"""
    # Validate texture type
    valid_types = ['albedo', 'normal', 'roughness', 'displacement', 'ao', 'metallic']
    if texture_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid texture type. Valid: {valid_types}")

    # Validate file
    if file.size and file.size > 50_000_000:  # 50MB
        raise HTTPException(status_code=400, detail="File too large")

    # Read and process image
    contents = await file.read()

    # TODO: Compress texture (KTX2/Basis)
    # TODO: Generate preview thumbnails

    # Upload to Supabase Storage
    storage_path = f"materials/{material_id}/{texture_type}_{uuid4()}.png"
    await supabase.storage.from_('material-textures').upload(
        storage_path,
        contents,
        {"content-type": file.content_type}
    )

    # Create DB record
    texture = MaterialTexture(
        material_id=material_id,
        texture_type=texture_type,
        storage_path=storage_path,
        original_filename=file.filename,
        file_size=len(contents),
        tiling_x=tiling_x,
        tiling_y=tiling_y
    )
    db.add(texture)
    db.commit()

    return {"id": texture.id, "path": storage_path}

@router.get("/textures/{material_id}")
async def get_material_textures(material_id: str):
    """Get all textures for a material"""
    textures = db.query(MaterialTexture).filter(
        MaterialTexture.material_id == material_id
    ).all()

    result = {}
    for tex in textures:
        # Get public URL
        url = supabase.storage.from_('material-textures').get_public_url(tex.storage_path)
        result[tex.texture_type] = {
            "id": tex.id,
            "url": url,
            "tiling": {"x": tex.tiling_x, "y": tex.tiling_y},
            "offset": {"x": tex.offset_x, "y": tex.offset_y}
        }

    return result

@router.delete("/textures/{texture_id}", status_code=204)
async def delete_texture(
    texture_id: str,
    current_user = Depends(get_admin_user)
):
    """Delete a texture"""
    texture = db.query(MaterialTexture).filter(MaterialTexture.id == texture_id).first()
    if not texture:
        raise HTTPException(status_code=404, detail="Texture not found")

    # Delete from storage
    await supabase.storage.from_('material-textures').remove([texture.storage_path])

    # Delete from DB
    db.delete(texture)
    db.commit()
```

### 4.3 Search and Filtering

```python
@router.get("/search")
async def search_materials(
    q: str = Query(..., min_length=2),
    category: Optional[str] = Query(None),
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    price_tier: Optional[str] = Query(None),
    availability: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    finish: Optional[str] = Query(None),
    sort_by: str = Query("relevance"),
    limit: int = Query(20, le=50)
):
    """
    Full-text search with faceted filtering
    Returns materials matching query with filter applied
    """
    query = db.query(Material).filter(Material.is_active == True)

    # Text search
    if q:
        query = query.filter(
            or_(
                Material.name.ilike(f"%{q}%"),
                Material.display_name.ilike(f"%{q}%"),
                Material.description.ilike(f"%{q}%"),
                Material.tags.contains([q])
            )
        )

    # Filters
    if category:
        query = query.filter(Material.category_id == category)
    if price_min:
        query = query.filter(Material.base_price_sqm >= price_min)
    if price_max:
        query = query.filter(Material.base_price_sqm <= price_max)
    if price_tier:
        query = query.filter(Material.price_tier == price_tier)
    if availability:
        query = query.filter(Material.availability == availability)
    if tags:
        query = query.filter(Material.tags.overlap(tags))

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(Material.base_price_sqm.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Material.base_price_sqm.desc())
    elif sort_by == "name":
        query = query.order_by(Material.display_name.asc())
    elif sort_by == "newest":
        query = query.order_by(Material.created_at.desc())
    # relevance uses default ordering

    return {
        "materials": query.limit(limit).all(),
        "total": query.count(),
        "filters": {
            "categories": get_category_counts(),
            "price_ranges": get_price_distribution(),
            "tags": get_tag_counts()
        }
    }
```

### 4.4 User Favorites and Presets

```python
@router.get("/favorites")
async def get_favorites(current_user = Depends(get_current_user)):
    """Get user's favorite materials"""
    favorites = db.query(UserMaterialFavorite).filter(
        UserMaterialFavorite.user_id == current_user.id
    ).all()

    material_ids = [f.material_id for f in favorites]
    materials = db.query(Material).filter(Material.id.in_(material_ids)).all()

    return materials

@router.post("/favorites/{material_id}")
async def add_favorite(
    material_id: str,
    notes: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Add material to favorites"""
    existing = db.query(UserMaterialFavorite).filter(
        UserMaterialFavorite.user_id == current_user.id,
        UserMaterialFavorite.material_id == material_id
    ).first()

    if existing:
        return existing

    favorite = UserMaterialFavorite(
        user_id=current_user.id,
        material_id=material_id,
        notes=notes
    )
    db.add(favorite)
    db.commit()

    return {"status": "added"}

@router.delete("/favorites/{material_id}")
async def remove_favorite(
    material_id: str,
    current_user = Depends(get_current_user)
):
    """Remove material from favorites"""
    db.query(UserMaterialFavorite).filter(
        UserMaterialFavorite.user_id == current_user.id,
        UserMaterialFavorite.material_id == material_id
    ).delete()
    db.commit()

    return {"status": "removed"}

@router.get("/presets")
async def get_presets(current_user = Depends(get_current_user)):
    """Get user's material presets"""
    return db.query(UserMaterialPreset).filter(
        UserMaterialPreset.user_id == current_user.id
    ).all()

@router.post("/presets")
async def create_preset(
    name: str,
    material_id: str,
    finish_id: Optional[str] = None,
    custom_textures: Optional[dict] = None,
    current_user = Depends(get_current_user)
):
    """Create a material preset"""
    preset = UserMaterialPreset(
        user_id=current_user.id,
        name=name,
        material_id=material_id,
        finish_id=finish_id,
        custom_textures=custom_textures or {}
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)

    return preset
```

---

## 5. Frontend Component Structure

### 5.1 Material Library Components

```
src/
├── components/
│   ├── materials/
│   │   ├── MaterialLibrary.tsx        # Main library container
│   │   ├── MaterialGrid.tsx            # Grid display of materials
│   │   ├── MaterialCard.tsx            # Individual material card
│   │   ├── MaterialSearch.tsx          # Search input with suggestions
│   │   ├── MaterialFilters.tsx         # Filter sidebar/panel
│   │   ├── MaterialDetail.tsx          # Full material detail view
│   │   ├── MaterialPreview.tsx         # 3D preview component
│   │   ├── MaterialUploader.tsx        # Custom texture upload
│   │   ├── TextureManager.tsx         # Texture editing UI
│   │   ├── MaterialPricing.tsx        # Price calculator
│   │   ├── MaterialFavorites.tsx       # User favorites panel
│   │   ├── MaterialPresets.tsx        # User presets panel
│   │   └── MaterialSelector.tsx       # Compact selector for configurator
│   └── ui/
│       ├── TextureDropzone.tsx        # Drag-drop texture upload
│       ├── TexturePreview.tsx         # Texture thumbnail
│       └── PriceBadge.tsx             # Price display badge
├── hooks/
│   ├── useMaterials.ts                # Material data fetching
│   ├── useMaterialSearch.ts           # Search with debounce
│   ├── useMaterialFilters.ts         # Filter state management
│   ├── useTextureUpload.ts           # Texture upload logic
│   └── useMaterialPreview.ts         # 3D preview rendering
├── store/
│   └── materialStore.ts               # Zustand store for materials
├── lib/
│   ├── supabase/
│   │   └── materials.ts               # Material-specific supabase queries
│   └── materials/
│       ├── categories.ts             # Category definitions
│       ├── pbrDefaults.ts            # Default PBR values
│       └── pricing.ts                # Pricing calculations
└── types/
    └── materials.ts                  # Extended material types
```

### 5.2 Material Library Component

```tsx
// src/components/materials/MaterialLibrary.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useMaterials } from '@/hooks/useMaterials';
import { MaterialSearch } from './MaterialSearch';
import { MaterialFilters } from './MaterialFilters';
import { MaterialGrid } from './MaterialGrid';
import { MaterialDetail } from './MaterialDetail';
import { useMaterialFilters } from '@/hooks/useMaterialFilters';

interface MaterialLibraryProps {
  onSelectMaterial?: (material: StoneMaterial) => void;
  selectedMaterialId?: string;
}

export function MaterialLibrary({
  onSelectMaterial,
  selectedMaterialId,
}: MaterialLibraryProps) {
  const { materials, isLoading, error } = useMaterials();
  const { filters, setFilter, clearFilters } = useMaterialFilters();
  const [selectedMaterial, setSelectedMaterial] =
    useState<StoneMaterial | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter materials client-side for instant feedback
  const filteredMaterials = useMemo(() => {
    let result = materials;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.display_name.toLowerCase().includes(query) ||
          m.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filters.category) {
      result = result.filter((m) => m.category_id === filters.category);
    }

    // Apply price tier filter
    if (filters.priceTier) {
      result = result.filter((m) => m.price_tier === filters.priceTier);
    }

    // Apply price range filter
    if (filters.priceMin !== undefined) {
      result = result.filter((m) => m.base_price_sqm >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      result = result.filter((m) => m.base_price_sqm <= filters.priceMax!);
    }

    // Apply availability filter
    if (filters.availability) {
      result = result.filter((m) => m.availability === filters.availability);
    }

    // Apply tags filter
    if (filters.tags?.length) {
      result = result.filter((m) =>
        filters.tags!.some((tag) => m.tags?.includes(tag))
      );
    }

    return result;
  }, [materials, searchQuery, filters]);

  const handleSelectMaterial = (material: StoneMaterial) => {
    setSelectedMaterial(material);
    onSelectMaterial?.(material);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-72 border-r p-4 flex flex-col gap-4">
        <MaterialSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search materials..."
        />
        <MaterialFilters
          filters={filters}
          onFilterChange={setFilter}
          onClear={clearFilters}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            {filteredMaterials.length} Materials
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              Error loading materials
            </div>
          ) : (
            <MaterialGrid
              materials={filteredMaterials}
              selectedId={selectedMaterialId}
              onSelect={handleSelectMaterial}
            />
          )}
        </div>
      </main>

      {/* Detail Panel */}
      {selectedMaterial && (
        <MaterialDetail
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
        />
      )}
    </div>
  );
}
```

### 5.3 Material Preview Component (React Three Fiber)

```tsx
// src/components/materials/MaterialPreview.tsx
'use client';

import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { TextureLoader, MeshStandardMaterial, DoubleSide } from 'three';
import { useMaterialTextures } from '@/hooks/useMaterialTextures';

interface MaterialPreviewProps {
  materialId: string;
  finish?: SurfaceFinish;
  scale?: number;
}

function StoneSlab({
  albedoMap,
  normalMap,
  roughnessMap,
  roughness = 0.15,
  clearcoat = 0.2,
}: {
  albedoMap?: string;
  normalMap?: string;
  roughnessMap?: string;
  roughness?: number;
  clearcoat?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Load textures
  const [albedo, normal, roughnessTex] = useLoader(
    TextureLoader,
    [albedoMap, normalMap, roughnessMap].filter(Boolean) as string[]
  );

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[2, 1.5, 0.03]} />
      <meshStandardMaterial
        map={albedo}
        normalMap={normal}
        normalScale={[1, 1]}
        roughnessMap={roughnessTex}
        roughness={roughness}
        metalness={0}
        clearcoat={clearcoat}
        clearcoatRoughness={0.1}
        side={DoubleSide}
      />
    </mesh>
  );
}

export function MaterialPreview({
  materialId,
  finish,
  scale = 1,
}: MaterialPreviewProps) {
  const { textures, isLoading } = useMaterialTextures(materialId);

  const roughness = finish?.roughness_default ?? 0.15;
  const clearcoat = finish?.clearcoat ?? 0.2;

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg overflow-hidden">
      <Canvas shadows camera={{ position: [0, 2, 4], fov: 45 }}>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-5, 3, -5]} intensity={0.5} />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Stone Slab */}
          <StoneSlab
            albedoMap={textures.albedo?.url}
            normalMap={textures.normal?.url}
            roughnessMap={textures.roughness?.url}
            roughness={roughness}
            clearcoat={clearcoat}
          />

          {/* Ground shadow */}
          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />

          {/* Controls */}
          <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
            minDistance={2}
            maxDistance={8}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

---

## 6. Texture Management Strategy

### 6.1 Texture Pipeline

```
User Upload → Validation → Optimization → Storage → CDN → Client
                                  ↓
                           Preview Generation
                                  ↓
                           KTX2 Compression (optional)
```

### 6.2 Compression Strategy

| Texture Type | Original Format   | Compressed Format | Compression Ratio |
| ------------ | ----------------- | ----------------- | ----------------- |
| Albedo       | PNG/JPG (8-10MB)  | KTX2/Basis        | 4-6x              |
| Normal       | PNG (8-10MB)      | KTX2/Basis        | 3-4x              |
| Roughness    | PNG/JPG (2-5MB)   | KTX2/Basis        | 3-4x              |
| Displacement | PNG/EXR (10-20MB) | EXR (lossless)    | 2x                |

**Note:** KTX2/Basis Universal compression provides significant GPU memory savings but requires transcoding server-side. For initial implementation, use optimized PNG/JPG with client-side texture compression via `@react-three/drei`'s useTexture withktx2 loader.

### 6.3 Preview Generation

Generate multiple preview sizes:

```python
# Preview sizes
PREVIEW_SIZES = {
    'thumbnail': (128, 128),   # Grid cards
    'swatch': (256, 256),     # Detail panel
    'detail': (512, 512),      # Full detail view
    'hero': (1024, 1024),      # Featured display
}

async def generate_previews(texture_path: str, material_id: str):
    """Generate all preview sizes for a texture"""
    from PIL import Image
    import asyncio

    img = Image.open(texture_path)

    results = {}
    for name, size in PREVIEW_SIZES.items():
        # Resize maintaining aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)

        output_path = f"previews/{material_id}/{name}_{uuid4()}.webp"

        # Save as WebP for web optimization
        img.save(output_path, 'WEBP', quality=85, optimize=True)

        results[name] = output_path

    return results
```

### 6.4 Caching Strategy

- **CDN Caching:** Supabase Storage automatically caches at edge locations
- **Client Caching:** Use Service Worker for offline material access
- **Texture Pool:** Implement LRU texture pool for Three.js to manage GPU memory

```typescript
// Texture pooling example
class TexturePool {
  private pool: Map<string, THREE.Texture> = new Map();
  private maxSize: number = 20;

  get(key: string): THREE.Texture | undefined {
    const texture = this.pool.get(key);
    if (texture) {
      // Move to end (most recently used)
      this.pool.delete(key);
      this.pool.set(key, texture);
    }
    return texture;
  }

  set(key: string, texture: THREE.Texture) {
    // Evict oldest if at capacity
    if (this.pool.size >= this.maxSize) {
      const oldestKey = this.pool.keys().next().value;
      const oldTexture = this.pool.get(oldestKey);
      oldTexture?.dispose();
      this.pool.delete(oldestKey);
    }
    this.pool.set(key, texture);
  }
}
```

---

## 7. Material Pricing Integration

### 7.1 Pricing Calculation

```typescript
interface PriceCalculation {
  materialPrice: number;
  finishPrice: number;
  thicknessPrice: number;
  edgeProcessingPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}

function calculateMaterialPrice(
  material: StoneMaterial,
  finish: SurfaceFinish,
  thickness: number,
  dimensions: { length: number; width: number },
  processedEdges: ProcessedEdges
): PriceCalculation {
  // Material cost (per sqm)
  const areaSqm = (dimensions.length / 1000) * (dimensions.width / 1000);
  const baseMaterialPrice = material.base_price_sqm * areaSqm;

  // Thickness upcharge
  const thicknessPrice =
    (material.price_per_thickness?.[thickness] || material.base_price_sqm) -
    material.base_price_sqm;

  // Finish upcharge
  const finishPrice = finish.price_per_sqm
    ? finish.price_per_sqm * areaSqm
    : baseMaterialPrice * (finish.price_modifier - 1);

  // Edge processing
  const edgePerimeter = ((dimensions.length + dimensions.width) * 2) / 1000; // linear meters
  const edgeCount = Object.values(processedEdges).filter(Boolean).length;
  const edgeProcessingPrice = edgePerimeter * edgeCount * 15; // €15 per linear meter per edge

  const subtotal =
    baseMaterialPrice + thicknessPrice + finishPrice + edgeProcessingPrice;
  const tax = subtotal * 0.25; // 25% VAT
  const total = subtotal + tax;

  return {
    materialPrice: baseMaterialPrice + thicknessPrice,
    finishPrice,
    thicknessPrice,
    edgeProcessingPrice,
    subtotal,
    tax,
    total,
  };
}
```

### 7.2 Real-Time Price Updates

```tsx
// React hook for reactive pricing
function useMaterialPricing(
  material: StoneMaterial | null,
  finish: SurfaceFinish | null,
  dimensions: { length: number; width: number; height: number },
  processedEdges: ProcessedEdges
) {
  const [pricing, setPricing] = useState<PriceCalculation | null>(null);

  useEffect(() => {
    if (!material || !finish) return;

    const calculate = async () => {
      const result = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: material.id,
          finish_id: finish.id,
          thickness: dimensions.height,
          length: dimensions.length,
          width: dimensions.width,
          processed_edges: processedEdges,
        }),
      }).then((r) => r.json());

      setPricing(result);
    };

    calculate();
  }, [material, finish, dimensions, processedEdges]);

  return pricing;
}
```

---

## 8. Code Examples for Material Loading

### 8.1 Loading Materials in Three.js

```typescript
// src/lib/materials/loader.ts
import * as THREE from 'three';
import { TextureLoader } from 'three';

export class MaterialLoader {
  private textureLoader: TextureLoader;
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  async loadMaterialTextures(materialData: StoneMaterial): Promise<{
    albedo?: THREE.Texture;
    normal?: THREE.Texture;
    roughness?: THREE.Texture;
    ao?: THREE.Texture;
  }> {
    const textures: Record<string, THREE.Texture> = {};

    // Load each texture type if available
    const textureUrls = await this.fetchTextureUrls(materialData.id);

    for (const [type, url] of Object.entries(textureUrls)) {
      if (url) {
        textures[type] = await this.loadTexture(url);
      }
    }

    return textures as any;
  }

  private async loadTexture(url: string): Promise<THREE.Texture> {
    // Check cache first
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Configure texture
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1, 1);
          texture.colorSpace = THREE.SRGBColorSpace;

          // Cache
          this.textureCache.set(url, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  createPBRMaterial(
    textures: ReturnType<
      typeof this.loadMaterialTextures extends () => infer R ? R : never
    >,
    options: {
      roughness?: number;
      clearcoat?: number;
      normalScale?: number;
    } = {}
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      map: textures.albedo,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(
        options.normalScale ?? 1,
        options.normalScale ?? 1
      ),
      roughnessMap: textures.roughness,
      roughness: options.roughness ?? 0.5,
      metalness: 0,
      clearcoat: options.clearcoat ?? 0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.0,
    });

    if (textures.ao) {
      material.aoMap = textures.ao;
      material.aoMapIntensity = 1.0;
    }

    return material;
  }

  dispose() {
    // Clean up cached textures
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }
}
```

### 8.2 Using with React Three Fiber

```tsx
// src/components/canvas/StoneSlab.tsx
'use client';

import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useMaterialLoader } from '@/hooks/useMaterialLoader';

interface StoneSlabProps {
  materialId: string;
  finish?: SurfaceFinish;
  dimensions: { length: number; width: number; height: number };
}

export function StoneSlab({ materialId, finish, dimensions }: StoneSlabProps) {
  const { textures, isLoading } = useMaterialLoader(materialId);

  const material = useMemo(() => {
    if (!textures) return null;

    const mat = new THREE.MeshStandardMaterial({
      map: textures.albedo,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: textures.roughness,
      roughness: finish?.roughness_default ?? 0.15,
      metalness: 0,
      clearcoat: finish?.clearcoat ?? 0.2,
      clearcoatRoughness: 0.1,
    });

    if (textures.ao) {
      mat.aoMap = textures.ao;
      mat.aoMapIntensity = 0.5;
      mat.needsUpdate = true;
    }

    return mat;
  }, [textures, finish]);

  if (isLoading || !material) {
    return <meshStandardMaterial color="#cccccc" />;
  }

  // Convert mm to meters for Three.js
  const [length, width, height] = [
    dimensions.length / 1000,
    dimensions.width / 1000,
    dimensions.height / 1000,
  ];

  return (
    <mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <boxGeometry args={[length, width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
```

### 8.3 Hook for Material Data

```typescript
// src/hooks/useMaterials.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { StoneMaterial } from '@/types/materials';

interface UseMaterialsOptions {
  category?: string;
  featured?: boolean;
  limit?: number;
}

export function useMaterials(options: UseMaterialsOptions = {}) {
  const [materials, setMaterials] = useState<StoneMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('materials').select('*').eq('is_active', true);

      if (options.category) {
        query = query.eq('category_id', options.category);
      }

      if (options.featured) {
        query = query.eq('is_featured', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      setMaterials(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.featured, options.limit]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    isLoading,
    error,
    refetch: fetchMaterials,
  };
}

export function useMaterial(materialId: string) {
  const [material, setMaterial] = useState<StoneMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!materialId) return;

    async function fetch() {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (!error) {
        setMaterial(data);
      }
      setIsLoading(false);
    }

    fetch();
  }, [materialId]);

  return { material, isLoading };
}
```

---

## 9. User-Created Materials (Favorites & Presets)

### 9.1 Favorites System

```typescript
// src/hooks/useMaterialFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

export function useMaterialFavorites() {
  const { user } = useUser();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    if (!user) return;

    async function loadFavorites() {
      const { data } = await supabase
        .from('user_material_favorites')
        .select('material_id')
        .eq('user_id', user.id);

      if (data) {
        setFavoriteIds(new Set(data.map((f) => f.material_id)));
      }
    }

    loadFavorites();
  }, [user]);

  const toggleFavorite = useCallback(
    async (materialId: string) => {
      if (!user) return;

      const isFavorite = favoriteIds.has(materialId);

      if (isFavorite) {
        // Remove
        await supabase
          .from('user_material_favorites')
          .delete()
          .match({ user_id: user.id, material_id: materialId });

        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(materialId);
          return next;
        });
      } else {
        // Add
        await supabase
          .from('user_material_favorites')
          .insert({ user_id: user.id, material_id: materialId });

        setFavoriteIds((prev) => new Set(prev).add(materialId));
      }
    },
    [user, favoriteIds]
  );

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite: (id: string) => favoriteIds.has(id),
  };
}
```

### 9.2 Presets System

```typescript
// Preset data structure
interface MaterialPreset {
  id: string;
  name: string;
  material_id: string;
  finish_id?: string;
  custom_textures: {
    albedo?: string;
    normal?: string;
    roughness?: string;
  };
  tiling?: { x: number; y: number };
  custom_price?: number;
}

// UI Component for preset management
function MaterialPresetsPanel() {
  const { presets, createPreset, deletePreset, applyPreset } = useMaterialPresets();
  const [isCreating, setIsCreating] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleCreate = async () => {
    if (!presetName.trim()) return;

    await createPreset({
      name: presetName,
      material_id: currentMaterial?.id,
      finish_id: currentFinish?.id,
      custom_textures: currentCustomTextures
    });

    setIsCreating(false);
    setPresetName('');
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Your Presets</h3>

      <div className="space-y-2">
        {presets.map(preset => (
          <div
            key={preset.id}
            className="flex items-center justify-between p-2 border rounded"
          >
            <span>{preset.name}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => applyPreset(preset)}>
                Apply
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deletePreset(preset.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isCreating ? (
        <div className="mt-4 flex gap-2">
          <Input
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            placeholder="Preset name"
          />
          <Button onClick={handleCreate}>Save</Button>
          <Button variant="secondary" onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button className="mt-4" onClick={() => setIsCreating(true)}>
          Create Preset
        </Button>
      )}
    </div>
  );
}
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Database schema implementation (Supabase)
- [ ] Storage bucket setup
- [ ] Basic CRUD API endpoints
- [ ] Material type definitions
- [ ] Category seeding data

### Phase 2: Core Features (Week 3-4)

- [ ] Material library UI components
- [ ] Search and filter functionality
- [ ] Material detail view with pricing
- [ ] Integration with existing configurator

### Phase 3: Textures (Week 5-6)

- [ ] Texture upload component
- [ ] Server-side image processing
- [ ] Preview generation pipeline
- [ ] Texture compression (optional: KTX2)

### Phase 4: User Features (Week 7-8)

- [ ] Favorites system
- [ ] User presets
- [ ] Custom texture uploads
- [ ] Rating/reviews

### Phase 5: Optimization (Week 9)

- [ ] Texture caching
- [ ] Performance testing
- [ ] Mobile optimization
- [ ] CDN configuration

---

## 11. Confidence Assessment

| Area            | Confidence | Notes                                                         |
| --------------- | ---------- | ------------------------------------------------------------- |
| Stone Types     | HIGH       | Based on existing PBR materials system and industry standards |
| Database Schema | HIGH       | Uses Supabase (already in stack), standard relational design  |
| API Design      | HIGH       | RESTful patterns well-established in FastAPI                  |
| Texture Upload  | MEDIUM     | Server-side processing needs validation                       |
| Compression     | MEDIUM     | KTX2 requires additional tooling; standard formats safer      |
| Pricing         | HIGH       | Straightforward calculation based on existing patterns        |
| Frontend        | HIGH       | React Three Fiber patterns well-documented                    |
| Search/Filter   | HIGH       | Standard full-text search with faceted filtering              |

---

## 12. Gaps to Address

- **Texture Compression:** KTX2/Basis transcoding requires `basisu` CLI tool or web-based solution; initial implementation should use optimized PNG/JPG
- **3D Preview Performance:** Large texture sets may cause GPU memory issues; need texture pooling and LOD
- **Material Mixing:** Advanced features like custom blending not covered in initial scope
- **Multi-language:** Material names/descriptions currently single-language (Croatian/English)

---

## 13. Sources

- [Supabase Database Documentation](https://supabase.com/docs/guides/database) - HIGH
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) - HIGH
- [FastAPI CRUD Patterns](https://fastapi.tiangolo.com/tutorial/first-steps/) - HIGH
- [React Three Fiber Materials](https://docs.pmnd.rs/react-three-fiber/advanced/refining-materials) - HIGH
- [Three.js PBR Materials](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial) - HIGH
- [PBR Texture Guidelines - Poly Haven](https://polyhaven.com/textures) - MEDIUM
