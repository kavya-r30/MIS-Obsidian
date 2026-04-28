# backend/db/models.py
import enum
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    validated = "validated"
    flagged = "flagged"
    approved = "approved"
    rejected = "rejected"


class ValidationSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    error = "error"


class MasterDataType(str, enum.Enum):
    vendor = "vendor"
    cost_center = "cost_center"
    department = "department"


class RuleType(str, enum.Enum):
    missing_required_fields   = "missing_required_fields"
    vendor_not_in_master      = "vendor_not_in_master"
    cost_center_not_in_master = "cost_center_not_in_master"
    department_not_in_master  = "department_not_in_master"
    high_value_cash_payment   = "high_value_cash_payment"
    temporal_inconsistency    = "temporal_inconsistency"
    duplicate_invoice         = "duplicate_invoice"
    tax_amount_missing        = "tax_amount_missing"
    amount_threshold          = "amount_threshold"
    department_budget         = "department_budget"
    tax_rate_check            = "tax_rate_check"
    payment_method_check      = "payment_method_check"
    approval_required         = "approval_required"


class User(Base):
    __tablename__ = "users"
    id:               Mapped[int]           = mapped_column(Integer, primary_key=True)
    email:            Mapped[str]           = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password:  Mapped[str]           = mapped_column(String, nullable=False)
    full_name:        Mapped[str]           = mapped_column(String, nullable=False)
    role:             Mapped[UserRole]      = mapped_column(SAEnum(UserRole), nullable=False)
    is_active:        Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:       Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    last_login:       Mapped[datetime|None] = mapped_column(DateTime, nullable=True)
    department:       Mapped[str|None]      = mapped_column(String, nullable=True)
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", foreign_keys="Transaction.uploaded_by", back_populates="uploader"
    )


class Transaction(Base):
    __tablename__ = "transactions"
    id:                 Mapped[int]           = mapped_column(Integer, primary_key=True)
    file_path:          Mapped[str]           = mapped_column(String, nullable=False)
    original_filename:  Mapped[str|None]      = mapped_column(String, nullable=True)
    raw_text:           Mapped[str|None]      = mapped_column(Text)
    vendor_name:        Mapped[str|None]      = mapped_column(String)
    amount:             Mapped[float|None]    = mapped_column(Float)
    tax_amount:         Mapped[float|None]    = mapped_column(Float, nullable=True)
    currency:           Mapped[str|None]      = mapped_column(String)
    transaction_date:   Mapped[str|None]      = mapped_column(String)
    approval_date:      Mapped[str|None]      = mapped_column(String)
    upload_date:        Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    department:         Mapped[str|None]      = mapped_column(String)
    cost_center:        Mapped[str|None]      = mapped_column(String)
    approval_ref:       Mapped[str|None]      = mapped_column(String)
    invoice_number:     Mapped[str|None]      = mapped_column(String, nullable=True)
    payment_method:     Mapped[str|None]      = mapped_column(String)
    confidence_score:   Mapped[float]         = mapped_column(Float, default=0.0)
    status:             Mapped[TransactionStatus] = mapped_column(SAEnum(TransactionStatus), default=TransactionStatus.pending)
    is_duplicate:       Mapped[bool]          = mapped_column(Boolean, default=False)
    revalidation_count: Mapped[int]           = mapped_column(Integer, default=0)
    rejection_reason:   Mapped[str|None]      = mapped_column(String, nullable=True)
    uploaded_by:        Mapped[int]           = mapped_column(ForeignKey("users.id"))
    reviewed_by:        Mapped[int|None]      = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at:        Mapped[datetime|None] = mapped_column(DateTime, nullable=True)
    uploader: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by], back_populates="transactions")
    validation_logs: Mapped[list["ValidationLog"]] = relationship(
        "ValidationLog", back_populates="transaction", cascade="all, delete-orphan"
    )


class ValidationLog(Base):
    __tablename__ = "validation_logs"
    id:             Mapped[int]                = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[int]                = mapped_column(ForeignKey("transactions.id"))
    rule_name:      Mapped[str]                = mapped_column(String, nullable=False)
    severity:       Mapped[ValidationSeverity] = mapped_column(SAEnum(ValidationSeverity), nullable=False)
    message:        Mapped[str]                = mapped_column(String, nullable=False)
    passed:         Mapped[bool]               = mapped_column(Boolean, nullable=False)
    created_at:     Mapped[datetime]           = mapped_column(DateTime, default=datetime.utcnow)
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="validation_logs")


class Rule(Base):
    __tablename__ = "rules"
    id:          Mapped[int]                = mapped_column(Integer, primary_key=True)
    rule_name:   Mapped[str]                = mapped_column(String, unique=True, nullable=False)
    rule_type:   Mapped[RuleType]           = mapped_column(SAEnum(RuleType), nullable=False)
    threshold:   Mapped[float|None]         = mapped_column(Float, nullable=True)
    severity:    Mapped[ValidationSeverity] = mapped_column(SAEnum(ValidationSeverity), nullable=False, default=ValidationSeverity.warning)
    description: Mapped[str]                = mapped_column(String, nullable=False)
    parameters:  Mapped[str|None]           = mapped_column(Text, nullable=True)
    is_active:   Mapped[bool]               = mapped_column(Boolean, default=True)
    created_at:  Mapped[datetime]           = mapped_column(DateTime, default=datetime.utcnow)
    created_by:  Mapped[int|None]           = mapped_column(ForeignKey("users.id"), nullable=True)


class MasterData(Base):
    __tablename__ = "master_data"
    id:          Mapped[int]            = mapped_column(Integer, primary_key=True)
    type:        Mapped[MasterDataType] = mapped_column(SAEnum(MasterDataType), nullable=False)
    value:       Mapped[str]            = mapped_column(String, nullable=False)
    is_active:   Mapped[bool]           = mapped_column(Boolean, default=True)
    created_at:  Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow)
    description: Mapped[str|None]       = mapped_column(String, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    user_id:     Mapped[int|None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action:      Mapped[str]      = mapped_column(String, nullable=False)
    entity_type: Mapped[str|None] = mapped_column(String, nullable=True)
    entity_id:   Mapped[int|None] = mapped_column(Integer, nullable=True)
    details:     Mapped[str|None] = mapped_column(Text, nullable=True)
    timestamp:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
