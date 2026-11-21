#!/usr/bin/env python3
"""Validate a skill directory against the skill-builder standard."""

import json
import os
import re
import sys

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def _parse_frontmatter_simple(text: str) -> dict:
    """Minimal YAML-like frontmatter parser for key: value and key: >- multiline."""
    result = {}
    current_key = None
    current_lines: list[str] = []
    is_multiline = False

    for line in text.strip().split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        # Check for a new key
        m = re.match(r"^([a-z][a-z0-9-]*)\s*:\s*(.*)", line)
        if m and not line.startswith(" ") and not line.startswith("\t"):
            # Save previous key
            if current_key is not None:
                result[current_key] = " ".join(current_lines).strip()
            current_key = m.group(1)
            value = m.group(2).strip()
            if value in (">-", ">", "|", "|-"):
                is_multiline = True
                current_lines = []
            else:
                is_multiline = False
                current_lines = [value.strip("'\"")]
        elif current_key is not None and is_multiline:
            current_lines.append(stripped)

    if current_key is not None:
        result[current_key] = " ".join(current_lines).strip()

    return result


def validate(skill_path: str) -> list[str]:
    """Return a list of validation errors (empty = pass)."""
    errors: list[str] = []

    if not os.path.isdir(skill_path):
        return [f"Path '{skill_path}' is not a directory."]

    skill_name = os.path.basename(skill_path)

    # --- Check name format ---
    if not re.match(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", skill_name):
        errors.append(f"Skill name '{skill_name}' is not valid kebab-case.")
    if len(skill_name) > 64:
        errors.append(f"Skill name exceeds 64 characters ({len(skill_name)}).")

    # --- Check SKILL.md exists ---
    skill_md = os.path.join(skill_path, "SKILL.md")
    if not os.path.isfile(skill_md):
        errors.append("Missing required SKILL.md file.")
        return errors

    # --- Read and validate SKILL.md ---
    with open(skill_md, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    line_count = len(lines)
    if line_count > 500:
        errors.append(f"SKILL.md has {line_count} lines (max 500).")

    # --- Parse frontmatter ---
    if not content.startswith("---"):
        errors.append("SKILL.md must start with YAML frontmatter (---).")
        return errors

    parts = content.split("---", 2)
    if len(parts) < 3:
        errors.append("SKILL.md frontmatter is not properly closed (needs opening and closing ---).")
        return errors

    try:
        if HAS_YAML:
            fm = yaml.safe_load(parts[1])
        else:
            fm = _parse_frontmatter_simple(parts[1])
    except Exception as e:
        errors.append(f"SKILL.md frontmatter parse error: {e}")
        return errors

    if not isinstance(fm, dict):
        errors.append("SKILL.md frontmatter must be a YAML mapping.")
        return errors

    # Required fields
    if "name" not in fm:
        errors.append("Frontmatter missing required 'name' field.")
    elif fm["name"] != skill_name:
        errors.append(f"Frontmatter name '{fm['name']}' does not match directory name '{skill_name}'.")

    if "description" not in fm:
        errors.append("Frontmatter missing required 'description' field.")
    else:
        desc = str(fm["description"])
        if len(desc) > 1024:
            errors.append(f"Description is {len(desc)} chars (max 1024).")
        if "<" in desc or ">" in desc:
            errors.append("Description contains angle brackets (< or >), which are not allowed.")
        if "TODO" in desc:
            errors.append("Description still contains TODO placeholder.")

    # Only allowed keys
    allowed_keys = {"name", "description", "license", "allowed-tools", "metadata", "compatibility"}
    extra = set(fm.keys()) - allowed_keys
    if extra:
        errors.append(f"Frontmatter has disallowed keys: {extra}")

    # --- Check required subdirectories ---
    for subdir in ["references", "scripts", "assets"]:
        dirpath = os.path.join(skill_path, subdir)
        if not os.path.isdir(dirpath):
            errors.append(f"Missing '{subdir}/' directory.")

    # --- Check evals ---
    evals_path = os.path.join(skill_path, "evals", "evals.json")
    if not os.path.isfile(evals_path):
        errors.append("Missing evals/evals.json file.")
    else:
        try:
            with open(evals_path, "r", encoding="utf-8") as f:
                evals = json.load(f)
            if not isinstance(evals, list):
                errors.append("evals.json must be a JSON array.")
            elif len(evals) < 3:
                errors.append(f"evals.json has {len(evals)} prompts (need at least 3).")
            else:
                for i, e in enumerate(evals):
                    if "prompt" not in e:
                        errors.append(f"Eval {i+1} missing 'prompt' field.")
                    elif "TODO" in str(e.get("prompt", "")):
                        errors.append(f"Eval {i+1} prompt still contains TODO placeholder.")
                    if "assertions" not in e:
                        errors.append(f"Eval {i+1} missing 'assertions' field.")
                    elif not isinstance(e["assertions"], list) or len(e["assertions"]) < 4:
                        errors.append(f"Eval {i+1} needs at least 4 assertions (has {len(e.get('assertions', []))}).")
        except json.JSONDecodeError as e:
            errors.append(f"evals.json parse error: {e}")

    # --- Check references files are not too long without TOC ---
    refs_dir = os.path.join(skill_path, "references")
    if os.path.isdir(refs_dir):
        for fname in os.listdir(refs_dir):
            fpath = os.path.join(refs_dir, fname)
            if os.path.isfile(fpath) and fname.endswith(".md"):
                with open(fpath, "r", encoding="utf-8") as f:
                    ref_content = f.read()
                ref_lines = ref_content.split("\n")
                if len(ref_lines) > 300:
                    # Check for a table of contents
                    lower = ref_content.lower()
                    if "table of contents" not in lower and "## contents" not in lower and "## toc" not in lower:
                        errors.append(f"references/{fname} has {len(ref_lines)} lines but no table of contents.")

    return errors


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python validate_skill.py <skill-path>", file=sys.stderr)
        sys.exit(1)

    skill_path = sys.argv[1]
    errors = validate(skill_path)

    if errors:
        print(f"FAIL: {len(errors)} validation error(s) in '{skill_path}':")
        for e in errors:
            print(f"  ✗ {e}")
        sys.exit(1)
    else:
        print(f"PASS: '{skill_path}' is valid.")
        sys.exit(0)


if __name__ == "__main__":
    main()
