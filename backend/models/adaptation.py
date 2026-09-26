from datetime import datetime
from sqlmodel import SQLModel, Field

class AdaptationPlan(SQLModel, table=True):
    id: str = Field(primary_key=True)
    project_id: str = Field(primary_key=True)
    culture_id: str                     # FK to culture reference
    dialect: str
    region: str
    setting: str                        # rural or urban
    output_script: str                  # Devanagari, Latin, etc.
    decisions: str                      # JSON list of AdaptationDecision
    approved: bool = False
    created_at: datetime

class AdaptedScene(SQLModel, table=True):
    id: str = Field(primary_key=True)
    project_id: str = Field(primary_key=True)
    scene_id: str
    adaptation_plan_id: str
    original_dialogue: str
    adapted_dialogue: str
    cultural_changes: str               # JSON list of what changed + why
    confidence: str                     # HIGH / MEDIUM / LOW
    human_review_needed: bool
    review_reason: str | None = None
    continuity_warnings: str = "[]"     # JSON list
    verification_passed: bool = False
    verification_details: str = "{}"    # JSON checks breakdown
