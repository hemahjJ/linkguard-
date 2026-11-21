#!/usr/bin/env python3
"""Scaffold a new skill directory with all required files."""

import argparse
import json
import os
import sys
import textwrap


def scaffold(name: str, base: str = "skills") -> list[str]:
    """Create the standard skill directory structure and return created files."""
    root = os.path.join(base, name)
    dirs = [
        root,
        os.path.join(root, "references"),
        os.path.join(root, "scripts"),
        os.path.join(root, "assets"),
        os.path.join(root, "evals"),
    ]
    created: list[str] = []

    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # SKILL.md
    skill_md = os.path.join(root, "SKILL.md")
    if not os.path.exists(skill_md):
        with open(skill_md, "w", encoding="utf-8") as f:
            f.write(textwrap.dedent(f"""\
                ---
                name: {name}
                description: >-
                  TODO: Describe what this skill does and when it should trigger.
                  Include concrete keywords and phrases.
                ---

                # {name.replace('-', ' ').title()}

                ## Overview

                TODO: High-level purpose.

                ## Workflow

                1. TODO: Step 1
                2. TODO: Step 2
                3. TODO: Step 3

                ## Decision Rules

                - TODO: When to do X vs Y.

                ## References

                - [reference-name.md](./references/reference-name.md) — TODO: description.

                ## Examples

                ### Example 1

                **Input**: TODO
                **Output**: TODO
            """))
        created.append(skill_md)

    # evals/evals.json
    evals_path = os.path.join(root, "evals", "evals.json")
    if not os.path.exists(evals_path):
        evals = [
            {
                "prompt": f"TODO: Realistic eval prompt {i} for {name}",
                "assertions": [
                    {"text": "TODO: Verifiable assertion", "type": "contains"}
                ],
            }
            for i in range(1, 4)
        ]
        with open(evals_path, "w", encoding="utf-8") as f:
            json.dump(evals, f, indent=2)
        created.append(evals_path)

    # Placeholder reference
    ref = os.path.join(root, "references", "reference-name.md")
    if not os.path.exists(ref):
        with open(ref, "w", encoding="utf-8") as f:
            f.write(f"# Reference: {name}\n\nTODO: Detailed reference content.\n")
        created.append(ref)

    # Placeholder script
    script = os.path.join(root, "scripts", "placeholder.sh")
    if not os.path.exists(script):
        with open(script, "w", encoding="utf-8") as f:
            f.write("#!/usr/bin/env bash\n# TODO: Implement helper script\necho 'placeholder'\n")
        created.append(script)

    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold a new Antigravity skill")
    parser.add_argument("name", help="Skill name in kebab-case (e.g. frontend-engineering)")
    parser.add_argument("--base", default="skills", help="Base directory for skills")
    args = parser.parse_args()

    # Validate name
    import re
    if not re.match(r"^[a-z][a-z0-9-]*[a-z0-9]$", args.name) or "--" in args.name:
        print(f"ERROR: Invalid skill name '{args.name}'. Use kebab-case, no leading/trailing/double hyphens.", file=sys.stderr)
        sys.exit(1)
    if len(args.name) > 64:
        print(f"ERROR: Skill name exceeds 64 chars.", file=sys.stderr)
        sys.exit(1)

    files = scaffold(args.name, args.base)
    print(f"Scaffolded '{args.name}' with {len(files)} files:")
    for f in files:
        print(f"  {f}")


if __name__ == "__main__":
    main()
