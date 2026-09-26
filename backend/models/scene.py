from sqlmodel import SQLModel, Field

class Scene(SQLModel, table=True):
    id: str = Field(primary_key=True)   # SC01, SC02...
    project_id: str = Field(primary_key=True, foreign_key="project.id")
    scene_number: int
    int_ext: str                        # INT or EXT
    location_id: str                    # FK to Location
    sub_location: str | None = None
    time_of_day: str                    # morning/afternoon/night
    mood: str
    summary: str
    dramatic_purpose: str
    raw_text: str                       # Original scene text
    characters_present: str = "[]"      # JSON list of character IDs
    props_in: str = "[]"                # JSON list of prop IDs present/entering
    props_out: str = "[]"               # JSON list of prop IDs exiting/retained
    status: str = "PARSED"              # PARSED | PARSE_ERROR
    
class Location(SQLModel, table=True):
    id: str = Field(primary_key=True)   # LOC_001
    project_id: str = Field(primary_key=True)
    canonical_name: str
    aliases: str = "[]"                 # JSON list of all names seen
    description: str
