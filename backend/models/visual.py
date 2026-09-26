from datetime import datetime
from sqlmodel import SQLModel, Field

class GeneratedImage(SQLModel, table=True):
    id: str = Field(primary_key=True)
    project_id: str = Field(primary_key=True)
    adaptation_plan_id: str
    entity_type: str                    # character | costume | scene
    entity_id: str                      # CHAR_001 / COST_001 / SC01
    prompt_used: str                    # exact image prompt stored
    image_path: str                     # local file path
    generation_model: str = "black-forest-labs/flux.2-klein-4b"
    approved_before_generation: bool = True  # must be True always
    status: str = "COMPLETED"           # COMPLETED | GENERATION_FAILED
    created_at: datetime
