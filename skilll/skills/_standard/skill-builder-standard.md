# Skill Builder Standard

Every skill built by this system must follow the rules below.

## Skill Anatomy

```
skill-name/
├── SKILL.md              (required, under 500 lines)
├── references/           (deep docs, loaded only when needed; add a TOC if a file is over 300 lines)
├── scripts/              (executable helpers for repetitive/deterministic work)
├── assets/               (templates, boilerplates, starter files)
└── evals/evals.json      (3 realistic test prompts + verifiable assertions)
```

## SKILL.md Frontmatter Rules

- `name`: kebab-case, lowercase letters/digits/hyphens only, max 64 chars, no leading/trailing/double hyphens.
- `description`: max 1024 chars, NO angle brackets (< or >). It is the ONLY thing that decides when the skill triggers, so put all "when to use" info here. Make it slightly "pushy": state what the skill does AND list many concrete situations/keywords/phrases that should trigger it, including cases where the user doesn't name the domain explicitly.
- Only allowed frontmatter keys: name, description, license, allowed-tools, metadata, compatibility.

## Writing Rules

- Imperative form ("Use X", "Validate Y"). Explain WHY behind each instruction instead of shouting ALWAYS/NEVER. Avoid heavy-handed MUSTs.
- Progressive disclosure: SKILL.md holds the workflow + decision rules + pointers ("read references/x.md when doing Y"). Details live in references/.
- Generalize. Do not overfit to a single example. Include 2-3 short input/output examples.
- If a task will obviously be rewritten from scratch every time (e.g. a boilerplate generator, a linter wrapper, a checklist validator), bundle it as a tested script in scripts/.
- Security: skills are defensive/legitimate only. No malware, exploit code for unauthorized access, or data exfiltration.
- Content should be current: when a skill covers fast-moving tech (frameworks, cloud, AI), use web search to verify current versions/best practices before writing, and note the date verified.

## Autonomy Policy

- Do not ask for approval or clarification. If something is ambiguous, pick the most reasonable interpretation, write it under "Assumptions" at the top of the final report, and continue.
- Do all steps end-to-end: research, write, test, fix, finalize.
- Safe-by-default: work only inside the workspace folder. Never delete files outside it, never print or store real secrets/API keys, never run destructive commands against anything that isn't a throwaway test directory you created.
- If a step fails, diagnose, retry with a different approach (up to 3 times), then continue with the remaining work and list the unresolved item in the final report.

## Build -> Test -> Improve Loop

1. Research the domain (web search for current best practices; gather the real failure modes people hit).
2. Write SKILL.md + references + scripts + assets.
3. Write evals/evals.json with 3 realistic prompts (concrete, detailed, like a real user) and 4-6 objectively verifiable assertions each (avoid assertions that pass trivially).
4. Run validate_skill.py until it passes.
5. Package the skill.

## Final Report Format (max 15 lines)

Skill name | final description | files created | assumptions made | unresolved items.
