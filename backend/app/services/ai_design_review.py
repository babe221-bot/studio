from typing import List, Dict, Any
from pydantic import BaseModel

class DesignAnalysisRequest(BaseModel):
    length: float  # cm
    width: float   # cm
    height: float  # cm
    material_density: float # kg/m3
    material_name: str
    order_unit: str # 'piece', 'sqm', 'lm'

class Warning(BaseModel):
    severity: str # 'info', 'warning', 'critical'
    code: str
    message: str
    suggestion: str

def analyze_structural_limits(req: DesignAnalysisRequest) -> List[Warning]:
    warnings = []
    
    # Convert dimensions to meters for calculations
    length_m = req.length / 100.0
    width_m = req.width / 100.0
    thickness_m = req.height / 100.0
    
    # 1. Thickness Checks (Minimums for different applications)
    MIN_THICKNESS_COUNTERTOP = 2.0 # cm (20mm standard)
    MIN_THICKNESS_FLOOR = 1.5 # cm (15mm)
    MIN_THICKNESS_FACADE = 3.0 # cm (30mm)
    
    is_countertop = "kuhinjska" in req.material_name.lower() or "ploča" in req.material_name.lower()
    
    if req.height < MIN_THICKNESS_COUNTERTOP:
        warnings.append(Warning(
            severity="critical",
            code="THIN_SLAB",
            message=f"Debljina od {req.height}cm je premala za radnu površinu.",
            suggestion=f"Preporučena minimalna debljina za radne ploče je {MIN_THICKNESS_COUNTERTOP}cm."
        ))
        
    # 2. Span/Length Checks (Cantilever)
    # Rule of thumb: Max unsupported span for stone is roughly 100x thickness
    # If width < length, we assume length is the span
    max_recommended_span = (req.height * 100) # simple rule: 100x thickness
    
    # Check if it's a long narrow piece (like window sill)
    if length_m > 1.5 and width_m < 0.3 and req.height < 3.0:
         warnings.append(Warning(
            severity="warning",
            code="LONG_THIN_SLAB",
            message=f"Dugačka i tanka ploča ({req.length}x{req.width}x{req.height}cm) je sklona pucanju.",
            suggestion="Razmotriti deblju ploču (min 3cm) ili dodatno podupiranje."
        ))

    # 3. Weight Check
    volume_m3 = length_m * width_m * thickness_m
    weight_kg = volume_m3 * req.material_density
    
    if weight_kg > 150:
        warnings.append(Warning(
            severity="warning",
            code="HEAVY_LIFT",
            message=f"Ploča teži {weight_kg:.1f}kg. Potrebno je više osoba za montažu.",
            suggestion="Osigurajte dodatnu pomoć pri ugradnji."
        ))
        
    if weight_kg > 300:
         warnings.append(Warning(
            severity="critical",
            code="STRUCTURAL_SUPPORT",
            message=f"Ploča je teža od 300kg! Provjerite nosivost podloge.",
            suggestion="Kuhinjske nosače treba računati na težinu kamena + dodatno opterećenje."
        ))

    # 4. Aspect Ratio (Avoid extremely thin strips)
    if length_m > 0 and width_m > 0:
        ratio = length_m / width_m
        if ratio > 4:
            warnings.append(Warning(
                severity="warning",
                code="ASPECT_RATIO",
                message=f"Omjer duljine i širine je {ratio:.1f}:1. Moguće probleme s lomom.",
                suggestion="Izbjegavati dugačke uske trake bez podloge."
            ))

    return warnings
