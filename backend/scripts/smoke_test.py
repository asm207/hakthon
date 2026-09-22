"""Automated smoke test from the terminal. Exit code 0 = all steps passed, 1 = failure.

Usage (from the backend folder):
    .venv\\Scripts\\python scripts\\smoke_test.py --api-key sk_test_... [--base-url https://127.0.0.1:8000]
        [--ca-file C:\\Users\\<you>\\AppData\\Local\\mkcert\\rootCA.pem]
The key, URL and CA file can also come from PAYSIM_API_KEY, PAYSIM_BASE_URL and PAYSIM_CA_FILE.
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402

from app.smoke.runner import run_smoke  # noqa: E402

MARKS = {"passed": "[PASS]", "failed": "[FAIL]", "skipped": "[SKIP]"}


def main() -> int:
    parser = argparse.ArgumentParser(description="PaySim Sandbox smoke test")
    parser.add_argument("--base-url", default=os.getenv("PAYSIM_BASE_URL", "https://127.0.0.1:8000"))
    parser.add_argument("--api-key", default=os.getenv("PAYSIM_API_KEY"))
    parser.add_argument("--ca-file", default=os.getenv("PAYSIM_CA_FILE"),
                        help="CA certificate to trust for HTTPS (e.g. mkcert's rootCA.pem)")
    args = parser.parse_args()
    if not args.api_key:
        parser.error("an API key is required (--api-key or PAYSIM_API_KEY)")

    print(f"PaySim smoke test against {args.base_url}\n")
    headers = {"Authorization": f"Bearer {args.api_key}"}
    verify = args.ca_file or True
    with httpx.Client(base_url=args.base_url, headers=headers, verify=verify, timeout=15) as client:
        result = run_smoke(
            client,
            on_step=lambda s: print(f"{MARKS[s['status']]} {s['name']:<26} {s['duration_ms']:>5} ms  {s['detail']}"),
        )

    print(f"\n{'ALL STEPS PASSED' if result['passed'] else 'SMOKE TEST FAILED'} in {result['total_ms']} ms")
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
