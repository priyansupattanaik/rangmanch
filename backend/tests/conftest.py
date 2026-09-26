import os

# Unit tests stay on the deterministic mock providers even when a local
# NVIDIA key is present in .env.local.
os.environ["RANGMANCH_FORCE_MOCK"] = "1"
os.environ["LLM_MOCK"] = "true"
os.environ["IMAGE_GEN_MOCK"] = "true"
