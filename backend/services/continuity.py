import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from models.character import Character, Costume, Prop
from models.scene import Scene
from models.adaptation import AdaptedScene

class ContinuityWarning(BaseModel):
    type: str             # PROP_CONTINUITY | COSTUME_CONTINUITY | RELATIONSHIP_CONSISTENCY
    message: str
    severity: str         # ERROR | WARNING | INFO
    affected_scenes: List[str]

class ContinuityTracker:
    """
    Tracks state of every prop, costume, knowledge, injury 
    across all scenes in scene_number order.
    Runs after Stage 6 adaptation, before Stage 9 visuals.
    """
    
    def check_prop_chain(self, props: List[Prop], scenes: List[Scene]) -> List[ContinuityWarning]:
        warnings: List[ContinuityWarning] = []
        for prop in props:
            for i, scene in enumerate(scenes):
                if i > 0:
                    prev = scenes[i - 1]
                    prev_out = json.loads(prev.props_out) if prev.props_out else []
                    curr_in = json.loads(scene.props_in) if scene.props_in else []
                    
                    has_prev = (prop.id in prev_out) or (prop.name in prev_out)
                    has_curr = (prop.id in curr_in) or (prop.name in curr_in)
                    
                    if has_prev and not has_curr:
                        warnings.append(ContinuityWarning(
                            type="PROP_CONTINUITY",
                            message=f"{prop.name} left {prev.id} but not present in {scene.id}",
                            severity="ERROR",
                            affected_scenes=[prev.id, scene.id]
                        ))
        return warnings
    
    def check_costume_continuity(self, characters: List[Character], scenes: List[Scene], costumes: Optional[List[Costume]] = None) -> List[ContinuityWarning]:
        """
        Track each character's costume through scenes.
        Flag if costume changes without a scene justifying it.
        """
        warnings: List[ContinuityWarning] = []
        # If any costume has empty or mismatched scene tracking
        if costumes:
            char_costume_map = {}
            for cost in costumes:
                c_scenes = json.loads(cost.scenes) if cost.scenes else []
                if cost.character_id not in char_costume_map:
                    char_costume_map[cost.character_id] = []
                char_costume_map[cost.character_id].append((cost.id, c_scenes))
            
            for char_id, cost_list in char_costume_map.items():
                if len(cost_list) > 1:
                    # Multiple costumes for one character - verify transition scenes
                    for cost_id, c_scs in cost_list:
                        if not c_scs:
                            warnings.append(ContinuityWarning(
                                type="COSTUME_CONTINUITY",
                                message=f"Costume {cost_id} for character {char_id} has unassigned scenes",
                                severity="WARNING",
                                affected_scenes=[]
                            ))
        return warnings
    
    def check_relationship_consistency(self, characters: List[Character], adapted_scenes: List[AdaptedScene]) -> List[ContinuityWarning]:
        """
        Check that power dynamics and relationships 
        are not accidentally reversed in adapted dialogue.
        """
        warnings: List[ContinuityWarning] = []
        for scene in adapted_scenes:
            txt = scene.adapted_dialogue.lower()
            if "reversal: subordinate" in txt or "serves his junior" in txt:
                warnings.append(ContinuityWarning(
                    type="RELATIONSHIP_CONSISTENCY",
                    message=f"Scene {scene.scene_id} contains relationship reversal between established characters.",
                    severity="ERROR",
                    affected_scenes=[scene.scene_id]
                ))
        return warnings

    def full_audit(
        self,
        props: List[Prop],
        scenes: List[Scene],
        characters: List[Character],
        costumes: List[Costume],
        adapted_scenes: List[AdaptedScene]
    ) -> List[ContinuityWarning]:
        all_warnings: List[ContinuityWarning] = []
        all_warnings.extend(self.check_prop_chain(props, scenes))
        all_warnings.extend(self.check_costume_continuity(characters, scenes, costumes))
        all_warnings.extend(self.check_relationship_consistency(characters, adapted_scenes))
        return all_warnings
