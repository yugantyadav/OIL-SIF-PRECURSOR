import uuid
from sqlalchemy import Column, String, Text, Float, Boolean, Integer, DateTime, ForeignKey, Date, func
from sqlalchemy.orm import relationship
from database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Report(Base):
    __tablename__ = "reports"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(100), unique=True, nullable=False)  # R-001
    report_date = Column(Date, nullable=True)
    site = Column(String(200), nullable=True)       # location
    activity = Column(String(300), nullable=True)
    report_type = Column(String(50), nullable=True)  # Unsafe Act / Unsafe Condition / Near Miss
    risk = Column(String(20), nullable=True)         # Critical/High/Medium/Low
    status = Column(String(50), nullable=True)       # Open/Under Review/Resolved
    reported_by = Column(String(200), nullable=True)
    narrative = Column(Text, nullable=False)
    batch_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    classifications = relationship("Classification", back_populates="report", cascade="all, delete-orphan")
    lsr_tags = relationship("LSRTag", back_populates="report", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="report", cascade="all, delete-orphan")
    report_clusters = relationship("ReportCluster", back_populates="report", cascade="all, delete-orphan")

class Classification(Base):
    __tablename__ = "classifications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"))
    sif_probability = Column(Float, nullable=False)
    sif_flag = Column(Boolean, nullable=False)
    confidence_level = Column(String(20))
    model_version = Column(String(50))
    explanation_snippets = Column(Text, nullable=True)  # JSON string for SQLite compat
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    report = relationship("Report", back_populates="classifications")

class LSRTag(Base):
    __tablename__ = "lsr_tags"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"))
    rule_name = Column(String(100), nullable=False)
    confidence = Column(Float)
    matched_keywords = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    report = relationship("Report", back_populates="lsr_tags")

class Entity(Base):
    __tablename__ = "entities"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"))
    entity_type = Column(String(50))
    entity_value = Column(String(300), nullable=False)
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    report = relationship("Report", back_populates="entities")

class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    cluster_label = Column(String(200))
    description = Column(Text)
    report_count = Column(Integer, default=0)
    sif_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ReportCluster(Base):
    __tablename__ = "report_clusters"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"))
    cluster_id = Column(String(36), ForeignKey("clusters.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    report = relationship("Report", back_populates="report_clusters")

class Batch(Base):
    __tablename__ = "batches"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    filename = Column(String(300))
    total_reports = Column(Integer)
    sif_count = Column(Integer)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(200))
    role = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
 
