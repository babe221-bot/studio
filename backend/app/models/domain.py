from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from app.services.database import Base

class MaterialDB(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    density = Column(Numeric, nullable=False)
    cost_sqm = Column(Numeric, nullable=False)
    texture = Column(String, nullable=False, default="")
    color = Column(String, nullable=False, default="#ffffff")
    roughness_map = Column(String, nullable=True)
    normal_map = Column(String, nullable=True)
    metallic_map = Column(String, nullable=True)
    ambient_occlusion_map = Column(String, nullable=True)
    inventory_count = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class UserProfileDB(Base):
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True)  # Matches auth.users UUID
    full_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    billing_address = Column(String, nullable=True)  # Store JSON as string if using simple ORM mapping
    shipping_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(String, nullable=True)
    guest_session_id = Column(String, nullable=True)
    status = Column(String, default='pending_deposit')
    total_amount = Column(Numeric, nullable=False)
    deposit_amount = Column(Numeric, default=0)
    currency = Column(String, default='EUR')
    items = Column(String, nullable=False)  # JSON string
    shipping_method = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

class InvoiceDB(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, server_default=func.gen_random_uuid())
    order_id = Column(String, nullable=False)
    stripe_invoice_id = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    status = Column(String, default='draft')
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)

class SurfaceFinishDB(Base):
    __tablename__ = "surface_finishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cost_sqm = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class EdgeProfileDB(Base):
    __tablename__ = "edge_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cost_m = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
