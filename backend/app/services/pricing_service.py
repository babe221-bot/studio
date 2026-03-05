from typing import Optional, Literal
from pydantic import BaseModel
from app.models.domain import MaterialDB, SurfaceFinishDB, EdgeProfileDB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class PriceCalculationRequest(BaseModel):
    length: float  # cm
    width: float   # cm
    height: float  # cm
    quantity: float
    order_unit: Literal['piece', 'sqm', 'lm']
    
    material_id: str
    finish_id: str
    profile_id: str
    
    processed_edges: dict[str, bool]  # front, back, left, right
    okapnik_edges: dict[str, bool]    # front, back, left, right
    
    bunja_edge_style: Optional[Literal['oštre', 'lomljene']] = None
    has_special_bunja_edges: bool = False

class PriceCalculationResponse(BaseModel):
    surface_area: float
    weight: float
    material_cost: float
    processing_cost: float
    okapnik_cost: float
    total_cost: float
    currency: str = "EUR"

async def calculate_price(
    req: PriceCalculationRequest,
    db: AsyncSession
) -> PriceCalculationResponse:
    
    # Fetch DB objects
    material = await db.get(MaterialDB, int(req.material_id))
    finish = await db.get(SurfaceFinishDB, int(req.finish_id))
    profile = await db.get(EdgeProfileDB, int(req.profile_id))
    
    if not material or not finish or not profile:
        raise ValueError("Invalid material, finish, or profile ID")

    # Constants
    OKAPNIK_COST_PER_M = 5.0
    BUNJA_BROKEN_EDGE_UPCHARGE_SQM = 25.0

    # Conversions
    length_m = req.length / 100.0
    width_m = req.width / 100.0
    height_m = req.height / 100.0
    
    # Initialize totals
    total_cost = 0.0
    surface_area = 0.0
    weight = 0.0
    material_cost = 0.0
    processing_cost = 0.0
    okapnik_cost = 0.0

    # Per-piece calculations (base unit)
    surface_area_m2_piece = length_m * width_m
    # density is usually kg/m3 if not specified otherwise in DB model, need to check
    # In domain.py: density = Column(Numeric)
    # Assuming density is kg/m3. 
    # Frontend: (length * width * height * density) / 1000 
    # If L,W,H are cm, then volume_cm3 = L*W*H. 
    # If density is kg/m3. 
    # volume_m3 = volume_cm3 / 1,000,000.
    # Frontend logic: (L*W*H * density) / 1000.
    # If L=100, W=100, H=1 -> 10,000 cm3. 
    # If density = 2500 kg/m3.
    # Real weight = 0.01 m3 * 2500 = 25kg.
    # Frontend: (100*100*1 * 2500) / 1000 = 25,000 / 1000 = 25. Correct.
    
    weight_kg_piece = (req.length * req.width * req.height * float(material.density)) / 1000.0
    
    # Material cost
    material_cost_piece = surface_area_m2_piece * float(material.cost_sqm)

    # Edge processing
    processed_perimeter_m = 0.0
    if req.processed_edges.get('front'): processed_perimeter_m += length_m
    if req.processed_edges.get('back'): processed_perimeter_m += length_m
    if req.processed_edges.get('left'): processed_perimeter_m += width_m
    if req.processed_edges.get('right'): processed_perimeter_m += width_m
    
    edge_processing_cost_piece = processed_perimeter_m * float(profile.cost_m)

    # Okapnik
    okapnik_perimeter_m = 0.0
    if req.okapnik_edges.get('front'): okapnik_perimeter_m += length_m
    if req.okapnik_edges.get('back'): okapnik_perimeter_m += length_m
    if req.okapnik_edges.get('left'): okapnik_perimeter_m += width_m
    if req.okapnik_edges.get('right'): okapnik_perimeter_m += width_m
    
    okapnik_cost_piece = okapnik_perimeter_m * OKAPNIK_COST_PER_M

    # Surface finish
    surface_processing_cost_piece = surface_area_m2_piece * float(finish.cost_sqm)
    
    # Aggregates per piece
    processing_cost_piece = surface_processing_cost_piece + edge_processing_cost_piece
    total_cost_piece = material_cost_piece + processing_cost_piece + okapnik_cost_piece

    # Final logic based on Order Unit
    if req.order_unit == 'piece':
        surface_area = surface_area_m2_piece * req.quantity
        weight = weight_kg_piece * req.quantity
        material_cost = material_cost_piece * req.quantity
        processing_cost = processing_cost_piece * req.quantity
        okapnik_cost = okapnik_cost_piece * req.quantity
        total_cost = total_cost_piece * req.quantity
        
    elif req.order_unit == 'sqm':
        surface_area = req.quantity
        material_cost = float(material.cost_sqm) * req.quantity
        processing_cost = float(finish.cost_sqm) * req.quantity
        
        if req.has_special_bunja_edges:
            if req.bunja_edge_style == 'lomljene':
                processing_cost += BUNJA_BROKEN_EDGE_UPCHARGE_SQM * req.quantity
            
            # Weight for sqm unit (assuming H is still relevant for thickness)
            weight = req.quantity * height_m * float(material.density)
        else:
             weight = req.quantity * height_m * float(material.density)
             
        total_cost = material_cost + processing_cost

    elif req.order_unit == 'lm':
        # Linear meters usually implies width is fixed/included or calculated differently
        # Frontend logic:
        # materialCost = width_m * cost_sqm * qty (qty is length in meters)
        
        material_cost_lm = width_m * float(material.cost_sqm)
        finish_cost_lm = width_m * float(finish.cost_sqm)
        profile_cost_lm = float(profile.cost_m)
        
        material_cost = material_cost_lm * req.quantity
        processing_cost = (finish_cost_lm + profile_cost_lm) * req.quantity
        total_cost = material_cost + processing_cost
        
        weight = width_m * height_m * float(material.density) * req.quantity
        surface_area = width_m * req.quantity

    return PriceCalculationResponse(
        surface_area=round(surface_area, 4),
        weight=round(weight, 2),
        material_cost=round(material_cost, 2),
        processing_cost=round(processing_cost, 2),
        okapnik_cost=round(okapnik_cost, 2),
        total_cost=round(total_cost, 2)
    )
