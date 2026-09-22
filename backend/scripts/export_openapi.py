"""Write the OpenAPI specification to docs/openapi.json (open it in https://editor.swagger.io or Postman).

Usage (from the backend folder):  .venv\\Scripts\\python scripts\\export_openapi.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402

spec = app.openapi()
spec["servers"] = [{"url": "https://127.0.0.1:8000", "description": "Local sandbox (HTTPS)"}]
out = ROOT.parent / "docs" / "openapi.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(spec, indent=2), encoding="utf-8")
print(f"Wrote {out} ({len(spec['paths'])} paths)")
