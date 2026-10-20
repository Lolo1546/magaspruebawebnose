from __future__ import annotations

import csv
import hashlib
import io
import os
import re
import shutil
import sys
import zipfile
from collections import Counter
from pathlib import Path

ORIGINAL = Path(r"C:\Users\ELIAS\Desktop\MangaZone")
WORK = Path(__file__).resolve().parent
CONTENT = WORK / "transfer-content"
STAGE = WORK / "transfer-package"
ZIP_PATH = WORK / "MangaZone-Sites-Transfer.zip"

DOCS = (
    "README.md",
    "MASTER_CONTEXT.md",
    "CONTRATOS_FUNCIONALES.md",
    "ARQUITECTURA_SITES.md",
    "INSTRUCCIONES_NUBE.md",
)

ROOT_FILES = (
    "README.md",
    "package.json",
    "pnpm-workspace.yaml",
    "apps/web/package.json",
    "apps/web/tsconfig.json",
    "apps/web/next.config.ts",
    "apps/web/eslint.config.mjs",
    "apps/api/package.json",
    "apps/api/tsconfig.json",
    "apps/api/tsconfig.build.json",
    "apps/api/nest-cli.json",
    "apps/api/prisma.config.ts",
    "packages/config/package.json",
    "packages/config/README.md",
    "packages/types/package.json",
    "packages/types/README.md",
    "infrastructure/README.md",
)

TREE_PREFIXES = (
    "apps/web/src",
    "apps/web/public/demo",
    "apps/api/src",
    "apps/api/prisma",
    "docs",
    "designs",
)

SKIP_PARTS = {
    "node_modules", ".next", "dist", "build", ".cache", ".pnpm-store",
    ".git", ".tmp", "__pycache__", "test", "tests", "__tests__",
    "fixtures", "__fixtures__",
}

SKIP_NAME = re.compile(r"(?:^|[.\-_])(test|spec|int-spec|fixture|fixtures)(?:[.\-_]|$)", re.I)
SKIP_SUFFIX = {".log", ".db", ".sqlite", ".sqlite3", ".pem", ".key", ".p12", ".pfx", ".exe", ".dll", ".map"}
ALLOWED_SUFFIX = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".svg", ".md", ".json", ".prisma", ".sql", ".toml", ".html", ".yaml", ".yml"}

SECRET_PATTERNS = {
    "OpenAI-style key": re.compile(rb"\bsk-[A-Za-z0-9_-]{20,}"),
    "AWS access key": re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    "private key block": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "credentialed URL": re.compile(rb"(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|https?)://[^/\s:@]+:[^@\s]+@", re.I),
    "JWT": re.compile(rb"\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{16,}\b"),
}

IMPORT_PATTERN = re.compile(
    r"(?:from\s+|import\s*\(|import\s+|require\s*\()\s*[\"']([^\"']+)[\"']"
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def path_string(path: Path) -> str:
    return path.as_posix()


def category(relative: str) -> str:
    if relative.startswith("apps/web/src/styles/"):
        return "tokens y estilos visuales"
    if relative.startswith("apps/web/src/app/"):
        return "rutas y vistas web"
    if relative.startswith("apps/web/src/components/"):
        return "componentes compartidos/visuales"
    if relative.startswith("apps/web/src/data/"):
        return "adaptadores de datos y fixtures identificados"
    if relative.startswith("apps/web/src/"):
        return "tipos y utilidades web"
    if relative.startswith("apps/web/public/demo/"):
        return "recurso demo local (cinco SVG y README)"
    if relative.startswith("apps/api/src/"):
        return "contrato y lógica de API/dominio"
    if relative.startswith("apps/api/prisma/migrations/"):
        return "migraciones y lock histórico, solo referencia"
    if relative.startswith("apps/api/prisma/"):
        return "modelo y reglas de datos"
    if relative.startswith("docs/"):
        return "documentación original"
    if relative.startswith("designs/"):
        return "HTML de intención visual, no canon productivo"
    return "configuración o contexto de código fuente"


def dependencies(name: str, data: bytes) -> str:
    if Path(name).suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
        return "—"
    text = data.decode("utf-8", errors="replace")
    imports = sorted(set(IMPORT_PATTERN.findall(text)))
    return "; ".join(imports) if imports else "—"


def include_source() -> list[Path]:
    selected: dict[str, Path] = {}
    for rel in ROOT_FILES:
        p = ORIGINAL / rel
        if not p.is_file():
            raise RuntimeError(f"Fuente requerida ausente: {rel}")
        selected[rel] = p
    for prefix in TREE_PREFIXES:
        root = ORIGINAL / prefix
        if not root.is_dir():
            raise RuntimeError(f"Carpeta requerida ausente: {prefix}")
        for p in root.rglob("*"):
            if not p.is_file():
                continue
            rel = p.relative_to(ORIGINAL)
            if any(part.lower() in SKIP_PARTS for part in rel.parts):
                continue
            if p.name.startswith(".env") or SKIP_NAME.search(p.name):
                continue
            if p.suffix.lower() in SKIP_SUFFIX or p.suffix.lower() not in ALLOWED_SUFFIX:
                continue
            selected[path_string(rel)] = p
    return [selected[k] for k in sorted(selected)]


def validate_no_secrets(name: str, data: bytes) -> None:
    hits = [label for label, pattern in SECRET_PATTERNS.items() if pattern.search(data)]
    if hits:
        raise RuntimeError(f"Patrón sensible en {name}: {', '.join(hits)}")


def make_manifest_summary(rows: list[dict[str, str]]) -> str:
    counts = Counter(row["proposito"] for row in rows if row["origen"] != "generado:S0.5")
    text = [
        "# Manifiesto de transferencia S0.5",
        "",
        "`MANIFEST.csv` enumera **cada entrada del ZIP**, incluida su ruta original, ruta de transferencia, propósito, importaciones directas detectadas y SHA-256. Los hashes de los documentos generados se incluyen salvo el del propio manifiesto CSV, que se deja vacío por autorreferencia. Las rutas son relativas a este paquete, bajo `reference/` para archivos originales.",
        "",
        "## Alcance seleccionado",
        "",
    ]
    for purpose, count in sorted(counts.items()):
        text.append(f"- {purpose}: {count} archivo(s).")
    text += [
        "",
        "Se conserva el código fuente de producción web/API, su esquema y SQL histórico, documentación original, 23 HTML de `designs/` y SVG abstractos creados localmente. Las rutas relativas se mantienen para seguir importaciones. `MANIFEST.csv` registra las importaciones directas como dependencias; importaciones de paquetes externos requieren instalación y adaptación futura y no se copian aquí.",
        "",
        "## Exclusiones deliberadas",
        "",
        "- `node_modules`, `.pnpm-store`, `.next`, `dist`, builds, cachés, logs y archivos temporales.",
        "- `.git`, commits/credenciales Git y cualquier `.env` o `.env.example`.",
        "- Tests y fixtures ejecutables: contienen ejemplos sintéticos de contraseñas/URLs con credenciales. Se documenta su estrategia, pero se excluyen para cumplir la restricción de no incluir credenciales. La ausencia de pruebas copiadas no significa que el código original carezca de ellas.",
        "- Bases de datos, dumps, datos de usuarios, medios reales, fuentes binarias y recursos remotos. No se descargó arte externo; los SVG incluidos son placeholders locales descritos como tales por el repositorio.",
        "- HTML de prototipos raíz y `prototype/`: se conservaron los 23 diseños solicitados dentro de `designs/` y el código visual productivo para evitar variantes redundantes.",
        "- Lockfile de instalación: el snapshot es referencia para adaptación, no un proyecto para instalar y arrancar sin cambios.",
        "",
        "## Cuestiones visuales pendientes",
        "",
        "- Home productiva tiene composición aprobada, pero datos fixture que deberán sustituirse por fuentes persistentes.",
        "- `designs/phase-3a/03-lector1.html` introduce la identidad «Sumi Reader»; su relación con el lector productivo requiere decisión de diseño.",
        "- Login/registro, reviews, reportes, notificaciones y funciones sociales sin pantalla productiva suficiente requieren diseño aprobado.",
        "- Las portadas demo SVG no son arte definitivo ni licencia para copiar portadas de terceros.",
        "",
        "## Límites de uso",
        "",
        "Este paquete no contiene un Site, dependencias instaladas, datos migrados ni pruebas de ejecución. Los archivos SQL son referencia histórica: no aplicarlos automáticamente a D1 u otra base. Ver `ARQUITECTURA_SITES.md` para validaciones S1.",
        "",
    ]
    return "\n".join(text)


def main() -> None:
    if not ORIGINAL.is_dir() or not CONTENT.is_dir():
        raise RuntimeError("Falta el origen o la carpeta de documentos S0.5")
    if STAGE.exists() or ZIP_PATH.exists():
        raise RuntimeError("El staging o ZIP ya existe; revisar antes de repetir")
    source_files = include_source()
    stage_reference = STAGE / "reference"
    stage_reference.mkdir(parents=True)
    rows: list[dict[str, str]] = []
    original_hashes: dict[str, str] = {}

    for source in source_files:
        rel = path_string(source.relative_to(ORIGINAL))
        data = source.read_bytes()
        validate_no_secrets(rel, data)
        target_rel = "reference/" + rel
        target = STAGE / target_rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        digest = sha256(data)
        original_hashes[target_rel] = digest
        rows.append({
            "origen": str(source),
            "transferencia": target_rel,
            "proposito": category(rel),
            "dependencias": dependencies(rel, data),
            "sha256": digest,
        })

    for name in DOCS:
        source = CONTENT / name
        if not source.is_file():
            raise RuntimeError(f"Falta documento S0.5: {name}")
        data = source.read_bytes()
        validate_no_secrets(name, data)
        (STAGE / name).write_bytes(data)
        rows.append({"origen": "generado:S0.5", "transferencia": name,
                     "proposito": "documentación de transferencia", "dependencias": "—", "sha256": sha256(data)})

    summary = make_manifest_summary(rows).encode("utf-8")
    validate_no_secrets("MANIFEST.md", summary)
    (STAGE / "MANIFEST.md").write_bytes(summary)
    rows.append({"origen": "generado:S0.5", "transferencia": "MANIFEST.md",
                 "proposito": "resumen de manifiesto y exclusiones", "dependencias": "MANIFEST.csv", "sha256": sha256(summary)})
    rows.append({"origen": "generado:S0.5", "transferencia": "MANIFEST.csv",
                 "proposito": "inventario exhaustivo del ZIP", "dependencias": "—", "sha256": ""})
    rows.sort(key=lambda row: row["transferencia"])
    manifest = STAGE / "MANIFEST.csv"
    with manifest.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=("origen", "transferencia", "proposito", "dependencias", "sha256"))
        writer.writeheader()
        writer.writerows(rows)

    expected = {row["transferencia"] for row in rows}
    actual = {path_string(p.relative_to(STAGE)) for p in STAGE.rglob("*") if p.is_file()}
    if expected != actual:
        raise RuntimeError(f"Manifiesto y directorio no coinciden: {expected ^ actual}")
    for row in rows:
        path = STAGE / row["transferencia"]
        data = path.read_bytes()
        validate_no_secrets(row["transferencia"], data)
        if row["sha256"] and sha256(data) != row["sha256"]:
            raise RuntimeError(f"Hash del manifiesto incorrecto: {row['transferencia']}")
        if row["transferencia"] in original_hashes and original_hashes[row["transferencia"]] != sha256(data):
            raise RuntimeError(f"Copia alterada: {row['transferencia']}")

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in sorted(expected):
            z.write(STAGE / rel, rel)
    with zipfile.ZipFile(ZIP_PATH, "r") as z:
        bad = z.testzip()
        if bad:
            raise RuntimeError(f"Entrada ZIP corrupta: {bad}")
        zip_names = set(z.namelist())
        if zip_names != expected:
            raise RuntimeError(f"ZIP y manifiesto no coinciden: {zip_names ^ expected}")
        for row in rows:
            data = z.read(row["transferencia"])
            if data != (STAGE / row["transferencia"]).read_bytes():
                raise RuntimeError(f"Contenido ZIP distinto: {row['transferencia']}")
            validate_no_secrets(row["transferencia"], data)

    size = ZIP_PATH.stat().st_size
    print(f"source_files={len(source_files)} package_files={len(expected)} zip_bytes={size} zip_sha256={sha256(ZIP_PATH.read_bytes())}")
    print(f"stage={STAGE}")
    print(f"zip={ZIP_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
