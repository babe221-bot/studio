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
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

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
