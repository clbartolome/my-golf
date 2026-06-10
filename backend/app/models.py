import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.enums import (
    DistanceUnit,
    PenaltyReason,
    RoundStatus,
    ShotMissLine,
    ShotResult,
    ShotType,
)


class Base(DeclarativeBase):
    pass


class Round(Base):
    __tablename__ = "rounds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    course_name: Mapped[str] = mapped_column(Text, nullable=False)
    tees: Mapped[str | None] = mapped_column(Text)
    wind: Mapped[str | None] = mapped_column(Text)
    planned_holes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status: Mapped[RoundStatus] = mapped_column(
        Enum(RoundStatus, name="round_status", create_type=False),
        nullable=False,
        default=RoundStatus.in_progress,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    course_rating: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))
    slope_rating: Mapped[int | None] = mapped_column(SmallInteger, default=113)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    holes: Mapped[list["Hole"]] = relationship(back_populates="round", cascade="all, delete-orphan", order_by="Hole.hole_number")


class Hole(Base):
    __tablename__ = "holes"
    __table_args__ = (UniqueConstraint("round_id", "hole_number"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    round_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False)
    hole_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    par: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    starting_distance: Mapped[Decimal] = mapped_column(Numeric(6, 1), nullable=False)
    starting_unit: Mapped[DistanceUnit] = mapped_column(
        Enum(DistanceUnit, name="distance_unit", create_type=False),
        nullable=False,
        default=DistanceUnit.m,
    )
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    round: Mapped["Round"] = relationship(back_populates="holes")
    shots: Mapped[list["Shot"]] = relationship(back_populates="hole", cascade="all, delete-orphan", order_by="Shot.stroke_number")


class Shot(Base):
    __tablename__ = "shots"
    __table_args__ = (UniqueConstraint("hole_id", "stroke_number"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    hole_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("holes.id", ondelete="CASCADE"), nullable=False)
    stroke_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    shot_type: Mapped[ShotType] = mapped_column(
        Enum(ShotType, name="shot_type", create_type=False),
        nullable=False,
        default=ShotType.normal,
    )
    club: Mapped[str | None] = mapped_column(Text)
    distance_before: Mapped[Decimal | None] = mapped_column(Numeric(6, 1))
    distance_after: Mapped[Decimal | None] = mapped_column(Numeric(6, 1))
    distance_unit: Mapped[DistanceUnit | None] = mapped_column(Enum(DistanceUnit, name="distance_unit", create_type=False))
    result: Mapped[ShotResult | None] = mapped_column(Enum(ShotResult, name="shot_result", create_type=False))
    miss_line: Mapped[ShotMissLine | None] = mapped_column(
        Enum(ShotMissLine, name="shot_miss_line", create_type=False)
    )
    penalty_reason: Mapped[PenaltyReason | None] = mapped_column(Enum(PenaltyReason, name="penalty_reason", create_type=False))
    exclude_from_stats: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    hole: Mapped["Hole"] = relationship(back_populates="shots")


class BagClub(Base):
    __tablename__ = "bag_clubs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
