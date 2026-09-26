from sqlmodel import SQLModel, Field

class Character(SQLModel, table=True):
    id: str = Field(primary_key=True)   # CHAR_001
    project_id: str = Field(primary_key=True)
    canonical_name: str
    aliases: str = "[]"                 # JSON — ["Amar", "elder son", "A. Singh"]
    age: str | None = None
    role: str
    relationships: str = "{}"           # JSON — {"CHAR_002": "younger sister"}
    personality: str = ""
    emotional_arc: str = ""
    status: str = "CANONICAL"           # CANONICAL | MERGE_CANDIDATE
    merge_candidate_with: str | None = None
    approved: bool = False              # Human must approve before generation

class Costume(SQLModel, table=True):
    id: str = Field(primary_key=True)   # COST_001
    project_id: str = Field(primary_key=True)
    character_id: str
    description: str
    scenes: str = "[]"                  # JSON list of scene_ids where worn
    approved: bool = False

class Prop(SQLModel, table=True):
    id: str = Field(primary_key=True)   # PROP_001
    project_id: str = Field(primary_key=True)
    name: str
    last_seen_scene: str                # scene_id
    holder_character_id: str | None = None
