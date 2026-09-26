import os
from pathlib import Path

from dotenv import load_dotenv

_loaded = False


def load_project_env() -> None:
    """Load repo env files. `.env.local` overrides placeholders and holds the NVIDIA key."""
    global _loaded
    if _loaded:
        return
    _loaded = True

    here = Path(__file__).resolve()
    backend_dir = here.parents[1]
    root_dir = here.parents[2]
    bases = []
    for base in (Path.cwd(), backend_dir, root_dir):
        if base not in bases:
            bases.append(base)

    for base in bases:
        env_file = base / ".env"
        if env_file.is_file():
            load_dotenv(env_file, override=False)

    if os.getenv("RANGMANCH_FORCE_MOCK") == "1":
        os.environ["LLM_MOCK"] = "true"
        os.environ["IMAGE_GEN_MOCK"] = "true"
        return

    for base in bases:
        local_file = base / ".env.local"
        if local_file.is_file():
            load_dotenv(local_file, override=True)
