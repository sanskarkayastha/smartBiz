# SmartBiz — Code Decisions & Why

This file explains non-obvious decisions made in the codebase.
Read this before changing any of these patterns.

---

## Auth Service

### Why Java `record` for DTOs instead of a class with getters/setters?
Records are immutable by default and generate equals/hashCode/toString automatically.
DTOs are pure data carriers — they should never be mutated after creation.
Using records enforces that constraint at the language level and removes boilerplate.

### Why BCrypt strength 12 (not the default 10)?
BCrypt strength is the log2 cost factor — strength 12 means 4× slower than strength 10.
At ~250ms per hash on modern hardware, it's still fast enough for login but makes
brute-force attacks 4× harder. OWASP recommends 10 minimum; 12 is a safe upgrade
for a server that isn't handling thousands of logins per second.

### Why the same error message ("Invalid credentials") for both "user not found" AND "wrong password"?
If you return "User not found" for unknown emails, attackers can enumerate valid emails
by testing signups. Returning the same message for both cases prevents this.
This is called "username enumeration prevention" — a standard security practice.

### Why is the refresh token a UUID string (not a signed JWT)?
JWTs are self-contained — you can't revoke them without a blocklist.
A UUID stored in the database can be deleted on logout or re-login,
giving us true server-side revocation. The access token (JWT, 24h) is
short-lived so revocation isn't critical there; the refresh token (30 days)
is long-lived and must be revocable.

### Why `deleteByUserId` on every login (refresh token rotation)?
If a user logs in from a new device, the old refresh token is revoked.
This limits the window of abuse if an old refresh token leaks — the
next login automatically invalidates it. It also prevents token accumulation.

### Why `Long userId` in `RefreshToken` instead of `@ManyToOne User`?
This is the database-per-service rule. Even though `RefreshToken` and `User`
are in the same service right now, using a plain ID instead of a JPA relationship
keeps the data model honest — the token stores a reference, not a dependency.
It also avoids accidental lazy-loading issues.

### Why `@Builder.Default` on `role = "USER"` in the User entity?
Lombok's `@Builder` ignores field initializers unless `@Builder.Default` is added.
Without it, `user.getRole()` would return `null` when built with the builder pattern,
causing a NOT NULL constraint violation in PostgreSQL.

### Why `@Transactional` on service methods (signup, login)?
Both methods do multiple DB writes:
- signup: save User + save RefreshToken
- login: deleteByUserId + save RefreshToken

If the second write fails, `@Transactional` rolls back the first automatically.
Without it, you could have a user saved but no refresh token, or a deleted
token but no new one created.

### Why is `SecurityConfig` in the Auth Service permitting `/auth/**`?
The Auth Service only has `/auth/signup` and `/auth/login` — both are public by design.
Spring Security is configured but all auth endpoints are explicitly opened.
For downstream services, the API Gateway validates the JWT and passes `X-User-Id`,
so those services don't run their own JWT validation — they trust the header from Gateway.

### Why was `flyway-database-postgresql` needed separately from `flyway-core`?
Flyway 10+ split database-specific support into separate modules.
`flyway-core` is now database-agnostic — you must add the driver module for your DB.
This applies to every service that uses Flyway with PostgreSQL.

---

## Inventory Service

### Why record stock changes in `stock_history` instead of just updating `quantity`?
The `quantity` column is the current state; `stock_history` is the audit trail.
If stock goes wrong (theft, miscounts), you can trace every change.
It also feeds the Sales analytics — "how much was sold this week" comes from
summing `stock_history` entries with `type = 'SALE'`.

### Why does `adjustStock` take a signed `quantityChange` (positive or negative)?
A single field covers both deduction (`-5` for a sale) and addition (`+20` for a restock).
This keeps the endpoint generic — the Sales Service calls it with a negative value;
a manual restock uses a positive value. The service validates that quantity
never goes below zero.

### Why `findByIdAndUserId` instead of just `findById`?
Multi-tenancy: every query is scoped to the requesting user's ID.
If a user guesses another user's product ID and calls `GET /inventory/products/42`,
the query returns empty (not found) rather than leaking another business's data.
The `X-User-Id` header from the Gateway makes this automatic.

### Why a separate `POST /inventory/products/{id}/stock` endpoint for stock changes?
Stock adjustment is a distinct operation with its own audit trail (`stock_history`).
Mixing it into `PUT /inventory/products/{id}` would make it impossible to distinguish
"price update" from "stock deduction" in the history. It also lets the Sales Service
call exactly this endpoint atomically when recording a sale.

---

## General Patterns

### Why no comments in most of the code?
Well-named methods and variables explain what the code does.
Comments are reserved for non-obvious WHY decisions — which is what this file is for.
A comment like `// save user` above `userRepository.save(user)` adds no value.

### Why `@ControllerAdvice` for exception handling instead of try-catch in controllers?
Centralised error handling means every controller gets the same error format automatically.
Without it, you'd need identical try-catch blocks in every controller method,
and a missed catch would leak a 500 stack trace to the client.

### Why DTOs for all API responses instead of returning JPA entities directly?
JPA entities have lazy-loaded collections, bidirectional relationships, and
Hibernate proxies — serialising them directly can trigger N+1 queries or
infinite recursion. DTOs are plain objects with exactly the fields the client needs.
They also decouple the API contract from the database schema.

### Why `X-User-Id` header instead of parsing the JWT in every service?
The API Gateway is the single entry point. It validates the JWT once and
extracts the userId, passing it as a trusted header. If every service
re-validated the JWT, you'd need the JWT secret in all 8 services and
any key rotation would require redeploying all of them. Centralised validation
at the Gateway is simpler and more maintainable.
