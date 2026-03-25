# Command Standard Clarification — Integration Block

Use the following section inside the master execution playbook, immediately before the command section and again as a short reminder under the command heading.

---

## Important Implementation Note

The command section in this document is written as a **recommended repo command standard** for the team to implement.

It exists to define the **target operating model** for local development, testing, build, validation, CI/CD, release, and operational workflows.

It should **not** be interpreted as a claim that these commands already exist in the current codebase or repository.

Until the engineering team creates the repository structure and wires these commands into actual scripts, task runners, Makefile targets, package scripts, CLI utilities, CI jobs, and release automation, they remain the **target command contract** for implementation.

### How to read all command references in this playbook

- **Current state:** some or all commands may not yet exist.
- **Target state:** these commands should be implemented exactly, or with equivalent behavior, in the future codebase.
- **Team expectation:** engineering should treat this command list as a delivery standard and implementation checklist, not as proof of existing automation.

### Recommended implementation options in the future repository

- **Makefile targets** for common repo-wide workflows
- **package.json scripts** for frontend tasks
- **Poetry / uv / shell task runners** for Python services
- **scripts/** utilities for setup, validation, migrations, seed data, and release tasks
- **CI pipeline jobs** that mirror the same local command contract

### Interpretation rule

Every setup, build, test, run, migration, lint, seed, validation, packaging, deployment, rollback, and observability command in this playbook should be read as:

> **"This is the required command standard the team must implement in the repository."**

—not—

> **"This command is already available today."**

---

## Short reminder block for the command section

> **Note:** The commands below define the **target repo standard** to be implemented by engineering. They are included to standardize delivery and operations, and are **not assumed to already exist** in the current codebase.

---

## Recommended insertion points

### Insert this full clarification in:
- the introduction or preface of the playbook
- the section immediately before the command catalogue
- the onboarding/setup chapter if one exists

### Insert the short reminder in:
- the “Command Standard” section
- the “Recommended Repo Commands” section
- any appendix that lists operational commands

---

## Clean final wording for direct use in the playbook

**Important implementation note:** The command section in this playbook defines the **recommended repository command standard** for the engineering team to implement. It should be treated as a **target command contract** for the future codebase, not as a statement that these commands already exist today. Wherever commands are listed for setup, build, test, run, validation, deployment, rollback, or operations, they represent the intended standardized interface that the repository, scripts, CI/CD jobs, and developer tooling should eventually provide.

