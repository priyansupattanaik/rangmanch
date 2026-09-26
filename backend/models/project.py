from datetime import datetime
from sqlmodel import SQLModel, Field

class Project(SQLModel, table=True):
    id: str = Field(primary_key=True)  # uuid4
    name: str
    raw_screenplay: str                 # Original uploaded text
    status: str                         # UPLOADED|EXTRACTED|PLANNED|ADAPTED|VISUAL_DONE
    created_at: datetime
