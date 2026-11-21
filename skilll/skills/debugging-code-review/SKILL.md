---
name: debugging-code-review
description: >
  Systematic debugging and senior-engineer-level code review skill. Covers the
  scientific debugging loop (reproduce, isolate, hypothesize, verify), reading
  stack traces, git bisect, logging strategies, debugging async and concurrency
  bugs, production debugging without breaking things, rubber-duck debugging
  templates, code review checklists (correctness, security, performance,
  readability, tests), giving actionable review comments, PR size and
  description standards, Git workflows (trunk-based dev, rebase vs merge,
  conventional commits, resolving conflicts, recovering lost work with reflog),
  and refactoring safely with tests. Triggers on: bug, error, stack trace,
  not working, review my code, PR, pull request, git conflict, regression,
  debug, refactor, code review, broken build, crash, exception, segfault,
  race condition, deadlock, merge conflict, force push, lost commits, rebase,
  cherry-pick, flaky test, memory leak, performance regression.
license: MIT
allowed-tools:
  - read_file
  - run_command
  - write_file
  - edit_file
  - search_web
compatibility:
  - platform: any
  - languages: any
---

# Debugging and Code Review

This skill makes you debug systematically and review code like a senior engineer.
Use it whenever you encounter bugs, errors, failing tests, or need to review
code changes and manage Git workflows.

## When to Activate

- User reports a bug, error, crash, or "not working" situation
- User asks for a code review or PR review
- User has a git conflict, lost commits, or rebase issues
- User needs to refactor code safely
- User is debugging async, concurrency, or production issues

## Decision Tree

```
Is this a debugging task?
├─ Yes → Go to "Scientific Debugging Loop"
│   ├─ Is it a concurrency/async bug? → Load references/concurrency-bugs.md
│   ├─ Is it a production issue? → Follow "Production Debugging" below
│   └─ Need to find regression commit? → Use scripts/bisect_helper.sh
├─ Is this a code review? → Go to "Code Review Workflow"
│   └─ Load references/review-checklist.md
├─ Is this a Git problem? → Load references/git-recipes.md
└─ Is this a refactoring task? → Load references/refactoring-safely.md
```

---

## Scientific Debugging Loop

Follow this loop rigorously. Do NOT skip steps or guess randomly.

### Step 1: Reproduce

Pin down exact reproduction steps before doing anything else.

- Get the **exact** error message, stack trace, or misbehavior description
- Identify the **minimal** input that triggers the bug
- Confirm the environment (OS, language version, dependencies)
- Write a failing test if one does not exist

### Step 2: Isolate

Narrow the scope from "the whole system" to "this specific unit."

- Read the stack trace bottom-to-top; the deepest frame you own is the starting point
- Use binary search on the codebase (comment out halves, use `git bisect`)
- Check recent changes: `git log --oneline -20`, `git diff HEAD~5`
- Eliminate variables: hardcode inputs, mock dependencies, disable caching

### Step 3: Hypothesize

Form a **specific, falsifiable** hypothesis before changing code.

Bad: "Something is wrong with the database."
Good: "The `user_id` column returns NULL when the OAuth token expires because
the session middleware skips re-authentication on cached routes."

### Step 4: Verify

Design an experiment that **proves or disproves** the hypothesis.

- Add a targeted log statement or assertion
- Write a unit test that encodes the hypothesis
- Use a debugger breakpoint at the suspected location
- If disproved, return to Step 2 with new information

### Step 5: Fix and Confirm

- Apply the **minimal** fix
- Confirm the failing test now passes
- Run the full test suite to check for regressions
- Document root cause in the commit message

> For detailed playbook with examples, load `references/debugging-playbook.md`.

---

## Reading Stack Traces

1. **Start from the bottom** (most recent call) and scan upward
2. **Find the first frame in YOUR code** — that is your entry point
3. Note the **exception type** and **message** — they encode the root cause
4. Check for **"Caused by"** chains — the innermost cause is usually the real bug
5. Watch for **framework frames** that obscure your code (filter them mentally)

### Common Patterns

| Exception Pattern | Likely Cause |
|---|---|
| `NullPointerException` / `TypeError: cannot read property of undefined` | Uninitialized variable or missing null check |
| `IndexError` / `ArrayIndexOutOfBoundsException` | Off-by-one or empty collection |
| `ConnectionRefusedError` | Service not running or wrong port |
| `TimeoutError` | Deadlock, infinite loop, or slow dependency |
| `PermissionError` / `403` | Missing auth, wrong credentials, file perms |

---

## Git Bisect for Regressions

When a test that used to pass now fails and you do not know which commit broke it:

```bash
# Manual bisect
git bisect start
git bisect bad HEAD
git bisect good <last-known-good-sha>
# Git checks out a midpoint; test it, then:
git bisect good   # or
git bisect bad
# Repeat until Git identifies the first bad commit
git bisect reset

# Automated bisect with a test script
git bisect start HEAD <good-sha>
git bisect run ./scripts/bisect_helper.sh "python -m pytest tests/test_auth.py::test_login"
```

> See `scripts/bisect_helper.sh` for the helper and `references/git-recipes.md` for more Git workflows.

---

## Logging Strategies

Use **structured logging** with severity levels:

| Level | Use For |
|---|---|
| `ERROR` | Failures that need human attention now |
| `WARN` | Recoverable issues that may become errors |
| `INFO` | Key business events (user login, payment processed) |
| `DEBUG` | Detailed flow for development; disable in production |

Rules:
- Log **what happened**, **to what**, and **why it matters**
- Include correlation IDs for distributed tracing
- Never log secrets, tokens, passwords, or PII
- Use structured formats (JSON) so logs are searchable
- Prefer `logger.error("Failed to process order", exc_info=True)` over bare `print()`

---

## Production Debugging

When debugging in production, follow these safety rules:

1. **Read-only first** — query logs, metrics, traces before touching anything
2. **Feature flags** — disable suspect features rather than deploying hotfixes blindly
3. **Canary deploys** — roll fixes to 1% of traffic, then 10%, then 100%
4. **Reproduce in staging** — if at all possible, replicate the issue outside production
5. **Communicate** — alert the team before and after any production intervention
6. **Rollback plan** — always know how to revert: `git revert`, feature flag off, DNS switch

---

## Rubber-Duck Debugging Template

When stuck, answer these questions in writing:

```
1. What EXACTLY am I trying to do?
2. What EXACTLY is happening instead?
3. What is the SIMPLEST case where it works?
4. What is the SIMPLEST case where it fails?
5. What changed between working and broken?
6. What assumptions am I making that might be wrong?
```

---

## Code Review Workflow

### Before Reviewing

1. Read the PR title and description — understand the **intent**
2. Check the linked issue or ticket for context
3. Note the PR size: ideally under 400 lines changed (excluding generated code)

### Review Pass Order

Do **three passes** in this order:

**Pass 1 — Correctness and Logic**
- Does the code do what the PR description says?
- Are edge cases handled (null, empty, boundary values)?
- Are error paths handled (what if this call fails)?
- Is the state management correct (mutations, side effects)?

**Pass 2 — Security and Performance**
- Input validation and sanitization present?
- No SQL injection, XSS, path traversal, or SSRF vectors?
- No hardcoded secrets or credentials?
- Are database queries efficient (N+1, missing indexes)?
- Are there unnecessary allocations or copies in hot paths?

**Pass 3 — Readability and Maintainability**
- Are names descriptive and consistent with the codebase?
- Is the code self-documenting, or are comments needed?
- Is there duplicated logic that should be extracted?
- Are tests present and meaningful (not just coverage theater)?

> For the full checklist with examples, load `references/review-checklist.md`.

### Writing Review Comments

Every comment must be **actionable**. Use this format:

```
[severity] category: observation → suggestion

Example:
[must-fix] security: User input is interpolated directly into the SQL query
  on line 42 → Use parameterized queries: `cursor.execute("SELECT * FROM
  users WHERE id = ?", (user_id,))`

[nit] readability: The variable `d` is unclear → Rename to
  `days_since_last_login` for clarity.

[question] correctness: What happens if `get_user()` returns None here?
  I don't see a null check before accessing `.email` on line 87.
```

Severity levels:
- **must-fix**: Blocks merge. Bugs, security issues, data loss risks.
- **should-fix**: Strong recommendation. Tech debt, missing tests, poor error handling.
- **nit**: Style or minor improvement. Do not block merge for nits alone.
- **question**: Clarification needed. May or may not require code changes.

---

## PR Size and Description Standards

### Ideal PR Size
- Under 400 lines of meaningful changes (exclude generated files, lockfiles)
- If larger, split into stacked PRs or logical chunks
- Each PR should do **one thing**: one feature, one bugfix, one refactor

### PR Description Template

```markdown
## What
One-sentence summary of the change.

## Why
Link to issue/ticket. Explain the motivation.

## How
Brief explanation of the approach and key decisions.

## Testing
How was this tested? Include commands to run tests.

## Screenshots (if UI change)
Before/after screenshots or recordings.
```

> Use `scripts/pr_summary.py` to auto-generate a PR summary from staged changes.

---

## Git Workflows

### Trunk-Based Development
- Merge small changes to `main` frequently (at least daily)
- Use short-lived feature branches (1-3 days max)
- Use feature flags for incomplete work

### Rebase vs Merge
- **Rebase** for linear history on feature branches: `git rebase main`
- **Merge** (or squash-merge) when landing to main
- Never rebase shared/public branches

### Conventional Commits
```
type(scope): short description

feat(auth): add OAuth2 PKCE flow
fix(api): handle null response from payment gateway
refactor(db): extract connection pooling into module
docs(readme): add deployment instructions
test(auth): add integration tests for token refresh
chore(deps): bump lodash to 4.17.21
```

### Recovering Lost Work
```bash
# Find lost commits after bad rebase or force push
git reflog
# Identify the SHA before the mistake
git reset --hard <sha>
# Or cherry-pick specific lost commits
git cherry-pick <sha>
```

> For complete Git recipes, load `references/git-recipes.md`.

---

## Examples

### Example 1: Debugging a Failing Test

**Input**: "My test `test_user_creation` fails with `IntegrityError: UNIQUE constraint failed: users.email`."

**Output approach**:
1. Reproduce: Run `pytest tests/test_users.py::test_user_creation -xvs`
2. Read the stack trace: The error is in the ORM's `save()` call
3. Isolate: Check if test fixtures are creating duplicate users — look for missing test database cleanup between runs
4. Hypothesize: "The test database is not being reset between test runs, so the second run finds the user already exists"
5. Verify: Check if `setUp`/`tearDown` or fixtures handle cleanup; add `@pytest.fixture(autouse=True)` with DB rollback
6. Fix: Add proper test isolation with transaction rollback

### Example 2: Reviewing a PR

**Input**: "Review this PR that adds a new `/api/users/search` endpoint."

**Output approach**:
1. Read the PR description to understand intent
2. Pass 1 (Correctness): Check query parameter validation, pagination logic, empty result handling
3. Pass 2 (Security): Check for SQL injection in search query, rate limiting, authentication on endpoint
4. Pass 3 (Readability): Check naming consistency, test coverage for edge cases
5. Produce prioritized list: must-fix items first, then should-fix, then nits

### Example 3: Recovering from a Bad Force Push

**Input**: "I accidentally force-pushed to main and lost 3 commits."

**Output approach**:
1. Use `git reflog` to find the SHA of the commit before the force push
2. `git reset --hard <sha>` to restore the branch locally
3. `git push --force-with-lease origin main` to restore the remote
4. Verify with `git log --oneline -10` that all commits are back
5. Set up branch protection rules to prevent future force pushes to main
