import os
import io
import json
import zipfile
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel, Session, create_engine, select
from services.envload import load_project_env

load_project_env()

from models.project import Project
from models.scene import Scene, Location
from models.character import Character, Costume, Prop
from models.adaptation import AdaptationPlan, AdaptedScene
from models.visual import GeneratedImage

from services.extractor import extract_screenplay, extract_text_from_file
from services.normalizer import resolve_entities, EntityMaps
from services.planner import build_adaptation_plan, list_available_cultures, load_culture_ref
from services.adapter import adapt_all_scenes
from services.verifier import verify_adapted_scene
from services.continuity import ContinuityTracker
from services.image_gen import generate_visual_pipeline, ImageGenClient
from services.llm import LLMClient

DB_PATH = os.getenv("DB_PATH", "./rangmanch.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="RANGMANCH (रंगमंच) API",
    description="The Stage — Where Stories Become Culture. Screenplay Cultural Adaptation Engine.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./sample_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/static/output", StaticFiles(directory=OUTPUT_DIR), name="output")

# Helper Envelope Response
def api_response(data: Any = None, error: Optional[str] = None, status: str = "success"):
    return {
        "status": status if not error else "error",
        "data": data,
        "error": error
    }

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "rangmanch-backend"}

# -------------------------------------------------------------
# Cultures & Info
# -------------------------------------------------------------
@app.get("/api/cultures")
def get_cultures():
    try:
        cultures = list_available_cultures()
        return api_response(cultures)
    except Exception as e:
        return api_response(None, error=str(e), status="error")

# -------------------------------------------------------------
# Projects
# -------------------------------------------------------------
@app.post("/api/projects")
async def create_project(
    name: Optional[str] = Form(None),
    raw_screenplay: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    try:
        text_content = ""
        if file and file.filename:
            file_bytes = await file.read()
            text_content = extract_text_from_file(file_bytes, file.filename)
            if not name:
                name = file.filename.rsplit(".", 1)[0]
        elif raw_screenplay:
            text_content = raw_screenplay
        else:
            raise HTTPException(status_code=400, detail="Either raw_screenplay or a file must be provided.")

        project_id = str(uuid.uuid4())
        project_name = name or f"Project_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        project = Project(
            id=project_id,
            name=project_name,
            raw_screenplay=text_content,
            status="UPLOADED",
            created_at=datetime.now(timezone.utc)
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        return api_response({
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "created_at": project.created_at.isoformat()
        })
    except Exception as e:
        return api_response(None, error=str(e), status="error")

@app.get("/api/projects/{id}")
def get_project(id: str, session: Session = Depends(get_session)):
    project = session.get(Project, id)
    if not project:
        return api_response(None, error="Project not found", status="error")
    return api_response({
        "id": project.id,
        "name": project.name,
        "status": project.status,
        "created_at": project.created_at.isoformat(),
        "raw_screenplay": project.raw_screenplay
    })

# -------------------------------------------------------------
# Stage 1 + 2: Extract & Normalize
# -------------------------------------------------------------
@app.post("/api/projects/{id}/extract")
def run_extraction(id: str, session: Session = Depends(get_session)):
    try:
        project = session.get(Project, id)
        if not project:
            return api_response(None, error="Project not found", status="error")

        llm = LLMClient()
        extracted = extract_screenplay(project.raw_screenplay, project.id, llm_client=llm)
        entities = resolve_entities(extracted)

        # Clear existing entities for re-extraction
        for model in (Scene, Location, Character, Costume, Prop):
            existing = session.exec(select(model).where(model.project_id == id)).all()
            for item in existing:
                session.delete(item)

        # Save extracted scenes & resolved entities
        for sc in extracted.scenes:
            session.add(sc)
        for loc in entities.locations:
            session.add(loc)
        for char in entities.characters:
            session.add(char)
        for cost in entities.costumes:
            session.add(cost)
        for pr in entities.props:
            session.add(pr)

        project.status = "EXTRACTED"
        session.add(project)
        session.commit()

        return api_response({
            "project_id": id,
            "status": project.status,
            "scenes_count": len(extracted.scenes),
            "characters_count": len(entities.characters),
            "locations_count": len(entities.locations),
            "costumes_count": len(entities.costumes),
            "props_count": len(entities.props),
            "continuity_warnings": entities.continuity_warnings
        })
    except Exception as e:
        return api_response(None, error=str(e), status="error")

# -------------------------------------------------------------
# Gate 1: Entities Review & Approval
# -------------------------------------------------------------
@app.get("/api/projects/{id}/entities")
def get_entities(id: str, session: Session = Depends(get_session)):
    scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()
    characters = session.exec(select(Character).where(Character.project_id == id)).all()
    locations = session.exec(select(Location).where(Location.project_id == id)).all()
    costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
    props = session.exec(select(Prop).where(Prop.project_id == id)).all()

    # Calculate real-time continuity warnings
    tracker = ContinuityTracker()
    warnings = [w.model_dump() for w in tracker.check_prop_chain(props, scenes)]

    return api_response({
        "scenes": [s.model_dump() for s in scenes],
        "characters": [c.model_dump() for c in characters],
        "locations": [l.model_dump() for l in locations],
        "costumes": [cos.model_dump() for cos in costumes],
        "props": [p.model_dump() for p in props],
        "continuity_warnings": warnings
    })

@app.patch("/api/projects/{id}/entities")
def update_or_approve_entities(
    id: str,
    payload: Dict[str, Any],
    session: Session = Depends(get_session)
):
    try:
        project = session.get(Project, id)
        if not project:
            return api_response(None, error="Project not found", status="error")

        # Update specific character
        if "characters" in payload:
            for c_data in payload["characters"]:
                char = session.exec(select(Character).where(Character.id == c_data["id"], Character.project_id == id)).first()
                if char:
                    for k, v in c_data.items():
                        setattr(char, k, v)
                    session.add(char)

        # Update specific scene
        if "scenes" in payload:
            for s_data in payload["scenes"]:
                sc = session.exec(select(Scene).where(Scene.id == s_data["id"], Scene.project_id == id)).first()
                if sc:
                    for k, v in s_data.items():
                        setattr(sc, k, v)
                    session.add(sc)

        # Approve all characters/entities
        if payload.get("approve_all", False):
            chars = session.exec(select(Character).where(Character.project_id == id)).all()
            for c in chars:
                c.approved = True
                c.status = "CANONICAL"
                session.add(c)
            costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
            for cost in costumes:
                cost.approved = True
                session.add(cost)

        session.commit()
        return api_response({"message": "Entities updated successfully"})
    except Exception as e:
        return api_response(None, error=str(e), status="error")

# -------------------------------------------------------------
# Stage 4: Adaptation Planning
# -------------------------------------------------------------
@app.post("/api/projects/{id}/plan")
def create_plan(
    id: str,
    payload: Dict[str, Any],
    session: Session = Depends(get_session)
):
    try:
        project = session.get(Project, id)
        if not project:
            return api_response(None, error="Project not found", status="error")

        culture_id = payload.get("culture_id", "malwai")
        setting = payload.get("setting", "rural")
        output_script = payload.get("output_script", "Devanagari")

        characters = session.exec(select(Character).where(Character.project_id == id)).all()
        locations = session.exec(select(Location).where(Location.project_id == id)).all()
        costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
        props = session.exec(select(Prop).where(Prop.project_id == id)).all()

        entity_maps = EntityMaps(
            characters=characters,
            locations=locations,
            costumes=costumes,
            props=props,
            continuity_warnings=[]
        )

        plan = build_adaptation_plan(
            entities=entity_maps,
            culture_id=culture_id,
            project_id=id,
            setting=setting,
            output_script=output_script
        )

        # Remove existing plan for this project if any
        existing_plans = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).all()
        for ep in existing_plans:
            session.delete(ep)

        session.add(plan)
        project.status = "PLANNED"
        session.add(project)
        session.commit()
        session.refresh(plan)

        return api_response({
            "plan_id": plan.id,
            "culture_id": plan.culture_id,
            "dialect": plan.dialect,
            "region": plan.region,
            "setting": plan.setting,
            "output_script": plan.output_script,
            "decisions": json.loads(plan.decisions),
            "approved": plan.approved
        })
    except Exception as e:
        return api_response(None, error=str(e), status="error")

@app.get("/api/projects/{id}/plan")
def get_plan(id: str, session: Session = Depends(get_session)):
    plan = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).first()
    if not plan:
        return api_response(None, error="No adaptation plan found", status="error")
    
    # Also attach culture reference data for side-by-side view
    culture_data = load_culture_ref(plan.culture_id)
    return api_response({
        "plan": {
            "id": plan.id,
            "project_id": plan.project_id,
            "culture_id": plan.culture_id,
            "dialect": plan.dialect,
            "region": plan.region,
            "setting": plan.setting,
            "output_script": plan.output_script,
            "decisions": json.loads(plan.decisions),
            "approved": plan.approved,
            "created_at": plan.created_at.isoformat()
        },
        "culture_reference": culture_data
    })

@app.patch("/api/projects/{id}/plan/approve")
def approve_plan(
    id: str,
    payload: Optional[Dict[str, Any]] = None,
    session: Session = Depends(get_session)
):
    try:
        plan = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).first()
        if not plan:
            return api_response(None, error="No adaptation plan found", status="error")

        if payload and "decisions" in payload:
            plan.decisions = json.dumps(payload["decisions"])

        plan.approved = True
        session.add(plan)
        session.commit()
        return api_response({"message": "Adaptation plan approved (Gate 2 passed)", "plan_id": plan.id})
    except Exception as e:
        return api_response(None, error=str(e), status="error")

# -------------------------------------------------------------
# Stage 6 + 7: Dialogue Adaptation & Verification
# -------------------------------------------------------------
@app.post("/api/projects/{id}/adapt")
def run_adaptation(id: str, session: Session = Depends(get_session)):
    try:
        plan = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).first()
        if not plan:
            return api_response(None, error="Adaptation plan not found", status="error")
        if not plan.approved:
            return api_response(None, error="Plan must be approved by human first (Gate 2)", status="error")

        scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()
        if not scenes:
            return api_response(None, error="No scenes found for project", status="error")

        # Clear previously adapted scenes for this plan
        existing = session.exec(select(AdaptedScene).where(AdaptedScene.project_id == id)).all()
        for item in existing:
            session.delete(item)

        llm = LLMClient()
        adapted_scenes = adapt_all_scenes(scenes, plan, llm_client=llm)

        for ad in adapted_scenes:
            session.add(ad)

        project = session.get(Project, id)
        if project:
            project.status = "ADAPTED"
            session.add(project)

        session.commit()

        return api_response({
            "adapted_count": len(adapted_scenes),
            "all_passed": all(a.verification_passed for a in adapted_scenes),
            "review_needed_count": sum(1 for a in adapted_scenes if a.human_review_needed)
        })
    except Exception as e:
        return api_response(None, error=str(e), status="error")

@app.get("/api/projects/{id}/adapted")
def get_adapted_scenes(id: str, session: Session = Depends(get_session)):
    scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()
    adapted_scenes = session.exec(select(AdaptedScene).where(AdaptedScene.project_id == id)).all()

    adapted_map = {a.scene_id: a for a in adapted_scenes}
    combined = []
    for sc in scenes:
        ad = adapted_map.get(sc.id)
        combined.append({
            "scene": sc.model_dump(),
            "adapted": ad.model_dump() if ad else None,
            "verification": json.loads(ad.verification_details) if ad and ad.verification_details else []
        })

    return api_response(combined)

@app.patch("/api/projects/{id}/adapted/approve")
def approve_adapted_for_visuals(
    id: str,
    payload: Optional[Dict[str, Any]] = None,
    session: Session = Depends(get_session)
):
    """Gate 3: Human approves adapted screenplay and visuals generation."""
    try:
        project = session.get(Project, id)
        if not project:
            return api_response(None, error="Project not found", status="error")

        if payload and "scene_edits" in payload:
            for edit in payload["scene_edits"]:
                ad = session.exec(select(AdaptedScene).where(AdaptedScene.id == edit["id"], AdaptedScene.project_id == id)).first()
                if ad:
                    ad.adapted_dialogue = edit["adapted_dialogue"]
                    if "human_review_needed" in edit:
                        ad.human_review_needed = edit["human_review_needed"]
                    session.add(ad)

        project.status = "VISUAL_APPROVED"
        session.add(project)
        session.commit()

        return api_response({"message": "Screenplay approved for visual generation (Gate 3 passed)"})
    except Exception as e:
        return api_response(None, error=str(e), status="error")

# -------------------------------------------------------------
# Stage 9: Visual Generation & Gallery
# -------------------------------------------------------------
@app.post("/api/projects/{id}/generate")
def generate_visuals(id: str, session: Session = Depends(get_session)):
    try:
        project = session.get(Project, id)
        if not project:
            return api_response(None, error="Project not found", status="error")
        if project.status not in ("VISUAL_APPROVED", "VISUAL_DONE"):
            return api_response(None, error="Gate 3 Violation: Human approval is required before generating visuals", status="error")

        plan = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).first()
        characters = session.exec(select(Character).where(Character.project_id == id)).all()
        costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
        scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()
        adapted_scenes = session.exec(select(AdaptedScene).where(AdaptedScene.project_id == id)).all()

        client = ImageGenClient()
        images = generate_visual_pipeline(
            project_id=id,
            adaptation_plan=plan,
            characters=characters,
            costumes=costumes,
            scenes=scenes,
            adapted_scenes=adapted_scenes,
            client=client
        )

        for img in images:
            session.add(img)

        project.status = "VISUAL_DONE"
        session.add(project)
        session.commit()

        return api_response({
            "generated_count": len(images),
            "status": project.status
        })
    except Exception as e:
        return api_response(None, error=str(e), status="error")

@app.get("/api/projects/{id}/gallery")
def get_gallery(id: str, session: Session = Depends(get_session)):
    images = session.exec(select(GeneratedImage).where(GeneratedImage.project_id == id)).all()
    characters = session.exec(select(Character).where(Character.project_id == id)).all()
    costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
    scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()

    char_dict = {c.id: c.canonical_name for c in characters}
    scene_dict = {s.id: f"{s.int_ext} {s.location_id} - {s.time_of_day}" for s in scenes}

    items = []
    for img in images:
        label = ""
        if img.entity_type == "character":
            label = char_dict.get(img.entity_id, img.entity_id)
        elif img.entity_type == "costume":
            label = f"Costume for {char_dict.get(img.entity_id, img.entity_id)}"
        else:
            label = scene_dict.get(img.entity_id, img.entity_id)

        items.append({
            "id": img.id,
            "entity_type": img.entity_type,
            "entity_id": img.entity_id,
            "label": label,
            "prompt_used": img.prompt_used,
            "image_path": img.image_path,
            "relative_url": f"/static/output/{os.path.basename(os.path.dirname(img.image_path))}/{os.path.basename(img.image_path)}" if img.image_path else "",
            "generation_model": img.generation_model,
            "status": img.status,
            "created_at": img.created_at.isoformat()
        })

    return api_response(items)

# -------------------------------------------------------------
# Reports: Continuity & Review Queue
# -------------------------------------------------------------
@app.get("/api/projects/{id}/continuity")
def get_continuity_report(id: str, session: Session = Depends(get_session)):
    scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()
    props = session.exec(select(Prop).where(Prop.project_id == id)).all()
    characters = session.exec(select(Character).where(Character.project_id == id)).all()
    costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
    adapted_scenes = session.exec(select(AdaptedScene).where(AdaptedScene.project_id == id)).all()

    tracker = ContinuityTracker()
    warnings = tracker.full_audit(props, scenes, characters, costumes, adapted_scenes)
    return api_response([w.model_dump() for w in warnings])

@app.get("/api/projects/{id}/review-queue")
def get_review_queue(id: str, session: Session = Depends(get_session)):
    plan = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).first()
    plan_decisions = json.loads(plan.decisions) if plan and plan.decisions else []
    
    plan_review_items = [
        d for d in plan_decisions if d.get("confidence") == "LOW" or d.get("human_review")
    ]

    adapted_scenes = session.exec(select(AdaptedScene).where(AdaptedScene.project_id == id)).all()
    scene_review_items = [
        {
            "scene_id": a.scene_id,
            "confidence": a.confidence,
            "reason": a.review_reason,
            "warnings": json.loads(a.continuity_warnings) if a.continuity_warnings else []
        }
        for a in adapted_scenes if a.human_review_needed or not a.verification_passed
    ]

    return api_response({
        "plan_review_items": plan_review_items,
        "scene_review_items": scene_review_items
    })

# -------------------------------------------------------------
# Export ZIP Bundle
# -------------------------------------------------------------
@app.get("/api/projects/{id}/export")
def export_project(id: str, session: Session = Depends(get_session)):
    project = session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scenes = session.exec(select(Scene).where(Scene.project_id == id).order_by(Scene.scene_number)).all()
    adapted_scenes = session.exec(select(AdaptedScene).where(AdaptedScene.project_id == id)).all()
    props = session.exec(select(Prop).where(Prop.project_id == id)).all()
    characters = session.exec(select(Character).where(Character.project_id == id)).all()
    costumes = session.exec(select(Costume).where(Costume.project_id == id)).all()
    images = session.exec(select(GeneratedImage).where(GeneratedImage.project_id == id)).all()
    plan = session.exec(select(AdaptationPlan).where(AdaptationPlan.project_id == id)).first()

    tracker = ContinuityTracker()
    cont_warnings = [w.model_dump() for w in tracker.full_audit(props, scenes, characters, costumes, adapted_scenes)]

    # 1. Screenplay Markdown
    adapted_map = {a.scene_id: a.adapted_dialogue for a in adapted_scenes}
    screenplay_lines = [
        f"# {project.name.upper()} — REGIONAL ADAPTATION",
        f"**Culture / Dialect:** {plan.culture_id.upper() if plan else 'UNSPECIFIED'} ({plan.region if plan else ''})",
        f"**Setting:** {plan.setting.upper() if plan else 'RURAL'}",
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
        "---",
        ""
    ]
    for sc in scenes:
        screenplay_lines.append(f"## SCENE {sc.scene_number:02d} — {sc.int_ext}. {sc.location_id}")
        screenplay_lines.append(f"*Time:* {sc.time_of_day.upper()} | *Mood:* {sc.mood}\n")
        screenplay_lines.append(adapted_map.get(sc.id, sc.raw_text))
        screenplay_lines.append("\n---\n")

    adapted_screenplay_md = "\n".join(screenplay_lines)

    # 2. Scene Breakdown JSON
    scene_breakdown_json = json.dumps([
        {
            "scene_id": s.id,
            "scene_number": s.scene_number,
            "int_ext": s.int_ext,
            "location_id": s.location_id,
            "time_of_day": s.time_of_day,
            "mood": s.mood,
            "dramatic_purpose": s.dramatic_purpose,
            "summary": s.summary,
            "characters_present": json.loads(s.characters_present) if s.characters_present else []
        }
        for s in scenes
    ], indent=2)

    # 3. Continuity Report JSON
    continuity_report_json = json.dumps({
        "project_id": id,
        "total_warnings": len(cont_warnings),
        "warnings": cont_warnings
    }, indent=2)

    # Build ZIP in-memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("adapted_screenplay.md", adapted_screenplay_md)
        zip_file.writestr("scene_breakdown.json", scene_breakdown_json)
        zip_file.writestr("continuity_report.json", continuity_report_json)

        # Include generated visual files
        for img in images:
            if img.image_path and os.path.exists(img.image_path):
                arcname = os.path.join(img.entity_type + "_bible" if img.entity_type != "scene" else "scene_keyframes", os.path.basename(img.image_path))
                zip_file.write(img.image_path, arcname=arcname)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="rangmanch_{project.name.lower().replace(" ", "_")}_export.zip"'}
    )
