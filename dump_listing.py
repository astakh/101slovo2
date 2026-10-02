#!/usr/bin/env python3
"""
Скрипт создаёт текстовый листинг проекта, игнорируя файлы/папки из .gitignore
и стандартные служебные директории.

Запуск:
    python dump_listing.py

Результат сохраняется в файл project_listing.txt в корне проекта.
"""

import os
import re
import fnmatch
from pathlib import Path

# ============================================================
# 1. Стандартные игнорируемые папки и файлы (как в gitignore)
# ============================================================
DEFAULT_IGNORE_DIRS = {
    # VCS
    ".git", ".svn", ".hg",
    # Node
    "node_modules", ".next", ".nuxt", "dist", "build", ".cache", ".parcel-cache", "package-lock.json",
    ".turbo", ".vite",
    # Python
    "__pycache__", ".venv", "venv", "env", ".tox", ".mypy_cache", ".pytest_cache",
    ".ruff_cache", "htmlcov",
    # IDE
    ".idea", ".vscode", ".vs", "*.code-workspace",
    # OS
    ".DS_Store", "Thumbs.db",
    # Build / output
    "out", "target", "coverage", ".nyc_output",
    # Docker / env
    ".env", ".env.local", ".env.*.local",
    # Logs
    "logs", "*.log",
    # Temp
    "tmp", "temp",
}

# Бинарные расширения — их содержимое не имеет смысла выводить текстом
BINARY_EXTENSIONS = {
    # Изображения
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp", ".avif",
    # Шрифты
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
    # Архивы
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar", ".xz",
    # Документы
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    # Аудио / видео
    ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".avi", ".mov", ".flac",
    # Бинарники
    ".exe", ".dll", ".so", ".dylib", ".bin", ".obj", ".o", ".pyc", ".class",
    # Базы данных
    ".sqlite", ".db",
    # Прочее
    ".lock",  # package-lock.json и т.п. — огромные и бесполезные
}

# Максимальный размер файла для включения (1 МБ)
MAX_FILE_SIZE = 1 * 1024 * 1024

# ============================================================
# 2. Парсер .gitignore
# ============================================================
def parse_gitignore(root: Path) -> list[str]:
    """Читает .gitignore и возвращает список паттернов."""
    gitignore = root / ".gitignore"
    patterns = []
    if gitignore.exists():
        with open(gitignore, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                patterns.append(line)
    return patterns


def matches_any_pattern(rel_path: Path, patterns: list[str]) -> bool:
    """Проверяет, соответствует ли путь любому паттерну из .gitignore."""
    name = rel_path.name
    parts = rel_path.parts

    for pattern in patterns:
        # Паттерн вида "dir/" — применяется только к папкам
        if pattern.endswith("/"):
            pattern = pattern.rstrip("/")
            if name == pattern or any(p == pattern for p in parts):
                return True
            continue

        # Паттерн со слешем — применяется к полному относительному пути
        if "/" in pattern:
            if fnmatch.fnmatch(str(rel_path), pattern):
                return True
        else:
            # Иначе — только по имени файла/папки
            if fnmatch.fnmatch(name, pattern):
                return True
    return False


# ============================================================
# 3. Обход проекта
# ============================================================
def should_skip_dir(dir_name: str) -> bool:
    return dir_name in DEFAULT_IGNORE_DIRS or dir_name.startswith(".")


def is_binary_file(path: Path) -> bool:
    return path.suffix.lower() in BINARY_EXTENSIONS


def collect_files(root: Path, gitignore_patterns: list[str]) -> list[Path]:
    """Собирает все файлы проекта, учитывая игноры."""
    result = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = Path(dirpath).relative_to(root)

        # Удаляем игнорируемые директории из обхода
        dirnames[:] = [
            d for d in dirnames
            if not should_skip_dir(d)
            and not matches_any_pattern(rel_dir / d, gitignore_patterns)
        ]
        dirnames.sort()

        for filename in sorted(filenames):
            # Пропускаем сам скрипт и выходной файл
            if filename in ("dump_listing.py", "project_listing.txt"):
                continue

            full_path = Path(dirpath) / filename
            rel_path = full_path.relative_to(root)

            if is_binary_file(full_path):
                continue
            if matches_any_pattern(rel_path, gitignore_patterns):
                continue

            # Пропускаем слишком большие файлы
            try:
                if full_path.stat().st_size > MAX_FILE_SIZE:
                    continue
            except OSError:
                continue

            result.append(full_path)

    return result


# ============================================================
# 4. Вывод листинга
# ============================================================
def write_listing(root: Path, files: list[Path], output_path: Path) -> None:
    with open(output_path, "w", encoding="utf-8") as out:
        out.write(f"# Листинг проекта: {root.name}\n")
        out.write(f"# Всего файлов: {len(files)}\n")
        out.write("=" * 70 + "\n\n")

        for file_path in files:
            rel_path = file_path.relative_to(root)
            out.write(f"📄 {rel_path}\n")
            out.write("-" * 70 + "\n")
            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                out.write(content)
            except Exception as e:
                out.write(f"[Ошибка чтения: {e}]\n")
            out.write("\n\n")

    print(f"✅ Готово! Файлов обработано: {len(files)}")
    print(f"📁 Результат сохранён в: {output_path}")
    size_kb = output_path.stat().st_size / 1024
    print(f"📏 Размер выходного файла: {size_kb:.1f} КБ")


# ============================================================
# 5. Точка входа
# ============================================================
def main():
    root = Path(__file__).parent.resolve()
    print(f"🔍 Сканирую проект: {root}\n")

    gitignore_patterns = parse_gitignore(root)
    if gitignore_patterns:
        print(f"📋 Загружено правил из .gitignore: {len(gitignore_patterns)}")

    files = collect_files(root, gitignore_patterns)
    output_path = root / "project_listing.txt"
    write_listing(root, files, output_path)


if __name__ == "__main__":
    main()
