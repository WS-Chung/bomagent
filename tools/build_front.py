"""정적 시연 빌드 갱신 스크립트.

원본 프로젝트(BOM_Agent)의 서버를 띄운 상태에서 실행하면
  1. 모든 조회 API 응답을 ``static/mock/data/*.json`` 스냅샷으로 저장하고
  2. 원본의 정적 자산(app.js · i18n.js · pages · components · styles · images)을
     ``static/`` 으로 복사한다.

사용법 (저장소 루트 기준):

    # 1) 원본 프로젝트에서 서버 기동
    #    cd ../BOM_Agent && python app.py        → http://127.0.0.1:8000
    # 2) 스냅샷 갱신
    python tools/build_front.py --base http://127.0.0.1:8000

``--source`` 로 원본 static 폴더 경로를 지정할 수 있다
(기본값: ../BOM_Agent/app/static).
index.html · static/mock/api.js · vercel.json 은 건드리지 않는다.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="http://127.0.0.1:8000", help="원본 서버 주소")
parser.add_argument(
    "--source",
    default=str(ROOT.parent / "BOM_Agent" / "app" / "static"),
    help="원본 정적 자산 폴더",
)
parser.add_argument("--skip-assets", action="store_true", help="스냅샷만 갱신")
args = parser.parse_args()

BASE = args.base.rstrip("/")
SRC = pathlib.Path(args.source)
DATA = ROOT / "static" / "mock" / "data"


def get(path: str):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def save(name: str, payload) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    p = DATA / f"{name}.json"
    p.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"  {name}.json  {p.stat().st_size / 1024:.1f} KB")


print(f"[1/2] 스냅샷 수집 — {BASE}")

for name, path in [
    ("part_classes", "/api/part-classes"),
    ("manufacturers", "/api/manufacturers"),
    ("suppliers", "/api/suppliers"),
    ("products", "/api/products"),
    ("plan_months", "/api/plan-months"),
    ("production_plan", "/api/production-plan"),
    ("warehouse_markers", "/api/warehouse-markers"),
]:
    save(name, get(path))

save("parts", get("/api/parts?limit=200&offset=0")["items"])

boms = {}
for prod in get("/api/products"):
    boms[str(prod["id"])] = get(f"/api/products/{prod['id']}/bom")
save("boms", boms)

save("forecast", get("/api/dashboard/forecast"))
save("notices", {str(d): get(f"/api/notices?days={d}") for d in range(1, 8)})
save("receiving", get("/api/receiving?limit=200&offset=0")["items"])

audit: list = []
offset = 0
while True:
    page = get(f"/api/audit-log?limit=100&offset={offset}")
    audit.extend(page["items"])
    offset += 100
    if offset >= page["total"]:
        break
save("audit_log", audit)

prefixes = sorted({c["prefix"] for c in get("/api/part-classes")})
save("next_number", {p: get(f"/api/parts/next-number?prefix={p}") for p in prefixes})

if args.skip_assets:
    print("\n[2/2] 정적 자산 복사 건너뜀 (--skip-assets)")
else:
    print(f"\n[2/2] 정적 자산 복사 — {SRC}")
    target = ROOT / "static"
    for item in SRC.iterdir():
        # index.html 은 mock 스크립트가 추가된 저장소 루트 버전을 쓰고,
        # mock/ 은 이 저장소에만 있는 폴더이므로 덮어쓰지 않는다.
        if item.name in {"index.html", "index_en.html", "mock"}:
            continue
        dest = target / item.name
        if item.is_dir():
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(item, dest)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest)
        print(f"  {item.name}")

total = sum(f.stat().st_size for f in ROOT.rglob("*") if f.is_file())
print(f"\n완료 — 총 {total / 1024:.0f} KB")
