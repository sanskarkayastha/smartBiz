# AI Development Rules

Before making changes:

1. Analyze architecture.
2. Identify affected services.
3. Explain implementation plan.
4. Wait for approval for large refactors.

Never:

- Remove userId filtering.
- Return JPA entities.
- Modify old Flyway migrations.
- Bypass gateway authentication.
- Change API contracts without warning.

Always:

- Preserve backward compatibility.
- Follow existing package structure.
- Generate tests when changing business logic.
