# Known Limitations

1. cultures.json covers only 3 exact dialects (Malwai, Mewari, Majhi).
   Dialects not in this file will return LOW confidence 
   on all cultural decisions and require full human review.

2. Visual consistency across images is approximate.
   FLUX.2 Klein on this pipeline is text-to-image only.
   Character descriptions are passed as text — some visual drift 
   between scenes is expected.

3. Continuity tracking is structural, not semantic.
   The system tracks prop IDs and scene lists.
   It does not understand implied transfers ("she hands him the letter").

4. Cultural adaptation does not cover oral performance qualities —
   rhythm, stress, pause — only written text.

5. Two cultures are kept separate in data but share the same LLM.
   Prompt contamination between cultures cannot be fully ruled out.
   Human review of both plans side-by-side is recommended.

6. Image generation uses the NVIDIA API credit attached to `NVIDIA_API_KEY`.
   A full project still generates one plate per character, costume, and scene.
