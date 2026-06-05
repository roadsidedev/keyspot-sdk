# GO Market — Agent Development Guidelines

## Core Philosophy

Three principles govern every line of code written for GO Market:

1. **Clean Code** — code is clean if it can be read and enhanced by someone other than its author
2. **Test-Driven Development** — no production code without a failing test first
3. **First-Principles Understanding** — build from scratch before reaching for a library; understand the abstraction before depending on it

---

## 1. Clean Code (Uncle Bob)

### Naming
- Use intention-revealing names: `elapsedTimeInDays` not `d`, `cachedOdds` not `data`
- Class names are nouns (`AccaBuilder`, `VenueAdaptor`), method names are verbs (`computeHedgeStake`, `fetchUnifiedMarkets`)
- Avoid disinformation: not `marketList` if it's a `Map`
- Make meaningful distinctions: not `MarketInfo` vs `MarketData`

### Functions
- **Small**: shorter than you think — aim for under 20 lines
- **One thing**: a function does exactly one thing, with no side effects
- **One level of abstraction**: don't mix business logic with low-level RPC details
- **Few arguments**: 0 ideal, 1-2 okay, 3+ needs strong justification
- **Descriptive names**: `isLegResolved` not `check`

### Comments
- Don't comment bad code — rewrite it
- Explain yourself in code, not in comments
- If a comment describes *what* the code does, the code is not clean
- The only good comments are legal notices, TODOs with a ticket, or clarifications of non-obvious external library behavior

### Error Handling
- Use exceptions (or `Result` types), not return codes
- Don't return null / undefined — it forces every caller to check
- Don't pass null / undefined

### Formatting
- **Newspaper metaphor**: high-level concepts at the top, details at the bottom
- Variables declared near their usage
- Vertical density: related code lives close together

---

## 2. Test-Driven Development

### The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

### RED-GREEN-REFACTOR

1. **RED** — Write a minimal failing test for one behavior. Clear name, tests real code (not mocks).
2. **Verify RED** — Watch it fail. Confirm the failure message is expected and the reason is "feature missing", not a typo.
3. **GREEN** — Write the simplest possible code to pass the test. No extra features, no over-engineering.
4. **Verify GREEN** — Confirm the test passes and all other tests stay green.
5. **REFACTOR** — Clean up: remove duplication, improve names, extract helpers. Keep tests green. No new behavior.

### Testing Anti-Patterns (MANDATORY)

- **Never test mock behavior** — you're verifying the mock works, not that your code works
- **Never add test-only methods to production classes** — put them in test utilities
- **Never mock without understanding the dependency** — run the test against real code first, then mock minimally
- **Never use incomplete mocks** — mirror the real API structure completely
- **Tests are not optional follow-up** — they are part of implementation. Can't claim "done" without tests

### Key Rules

| Principle | Rule |
|-----------|------|
| Test behavior, not implementation | Tests should still pass after refactoring |
| One behavior per test | If "and" is in the test name, split it |
| Mocks are tools to isolate | Not things to test |
| If test setup is complex | The design is too coupled — use dependency injection |
| Tests must be FAST | If a test is slow, question what it tests |

### Error Edge Cases

- **Heuristic**: if you can name an edge case scenario, write a test for it
- **Network failures**: every call to an external API should have a test for timeout, 4xx, 5xx
- **State transitions**: every possible state machine transition should have a test
- **Empty / null / boundary**: empty arrays, zero values, boundary conditions

---

## 3. First-Principles Development (Karpathy)

### Build From Scratch, Then Use the Library

Before adding any npm package or library, ask:
- Can I write this in 50 lines of vanilla code?
- Do I understand what the library does under the hood?
- Is the library complexity justified by the problem?

Rule of thumb: if a utility is <50 lines and only used in one module, write it. If it's complex (crypto, serialization, chain interaction), reach for a battle-tested library.

### Start Simple

Always start with the simplest possible version:
1. Hardcode the data flow first, then generalize
2. Overfit a single market provider before building the adaptor abstraction
3. Get one acca leg working end-to-end before building the multi-leg builder

### "English is the New Programming Language"

- Test names and function names should read like clear English sentences
- `computeCombinedOdds(legs, overround)` needs no comment — it says what it does
- If you can't describe the function's purpose in one plain-English sentence, the function is doing too much

### Data Over Magic

- When something is wrong, log the data, inspect the shapes, read the error message carefully
- Data bugs are more common than logic bugs — verify your inputs before debugging your code
- A type error (wrong field name, wrong chain ID) is almost always the root cause

---

## 4. Project-Specific Conventions

### Folder Structure

```
src/
  app/              Next.js App Router pages & API routes
  components/       React components
  lib/
    adaptors/       VenueDataAdapter implementations (one per venue)
    engine/         Pricing, hedging, overround computation
    contract/       Smart contract interaction layer
    aggregation/    Market discovery, normalization, caching
    settlement/     Resolution monitoring & payout coordination
    relayer/        Gasless transaction submission
  hooks/            React hooks (useAcca, useMarkets, useBalance)
  types/            TypeScript types & Zod schemas
  utils/            Pure utility functions with no side effects
```

### TypeScript Style

- Strict mode. No `any` without explicit justification and a comment
- Every external API response gets a Zod schema — parse, don't trust
- `Result<T, E>` pattern for fallible operations instead of try/catch at every call site

### State Flow

```
User Action → React Hook → Service Function → Adaptor → Onchain
                                            ↓
                                      Cache/Index ← Aggregation
```

Data flows in one direction. Adaptors translate GO Market's internal types to venue-specific ABIs. No adaptor reaches into the UI layer.

### Smart Contract Interaction

- Every contract call is wrapped in a typed function with proper error handling
- Transaction states: `idle | pending | confirming | confirmed | failed`
- Gas estimation failures are surfaced to the user, not swallowed

### What NOT to Do

- Don't add abstractions before there are at least 3 concrete implementations
- Don't write a "utils" function that's only used once — inline it
- Don't mock entire services — mock at the adaptor boundary
- Don't leave TODOs without a ticket reference
- Don't commit commented-out code
- Don't make a test pass without watching it fail first
