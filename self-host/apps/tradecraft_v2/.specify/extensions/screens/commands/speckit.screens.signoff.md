---
description: "Check screens against the clarified spec and get the owner's sign-off; blocks plan until signed off"
---

# Screens sign-off (after clarify, before plan)

This is a **gate**. Technical design (`plan`) MUST NOT start until the screens and their wording are
signed off by the owner. It enforces constitution principle **V**.

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Find the feature.** Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` and
   read `FEATURE_DIR` and `FEATURE_SPEC`. Read `spec.md` (now clarified) and `screens.md`. If
   `screens.md` does not exist, stop: the rough-screens step has not run. Tell the owner to run
   `/speckit-screens-draft`, and tell the caller **not to continue to plan**.

2. **Not applicable.** If `screens.md` says `status: not-applicable`, report that, and let the caller
   continue.

3. **Already signed off and unchanged.** If `status: signed-off` and the recorded `spec-sha256`
   equals the current SHA-256 of `spec.md` (compute it with `sha256sum`), report "signed off on
   DATE, spec unchanged" and let the caller continue. If the spec changed since, the sign-off is
   stale: continue to step 4.

4. **Check the screens against the clarified spec.** Report any gap, and fix what you can by
   updating the Penpot frames and `screens.md` (ask the owner when it is a decision):
   - Every user story has at least one screen. Every functional requirement that touches the
     interface is covered.
   - The content list has no `TODO`, `TBD` or placeholder text. Every empty, error and notice
     message is written out.
   - States that the spec calls for are drawn (empty, filled, error, near-limit and so on).
   - Constitution check: each screen showing a money figure also shows process information beside
     it (principle I); a figure that cannot be computed shows a dash and says why (principle III).
   - The Penpot frames named in `screens.md` exist, and the exported images in `FEATURE_DIR/screens/`
     are current (export again if a frame changed).
   - Answers from clarify that change a screen are reflected in it.

5. **Ask for sign-off.** Show the owner the final frames and the gap report. Use AskUserQuestion
   with the summary inside the question text. Options: sign off, changes needed (they say what).
   If changes are needed, make them, show them again, and ask again.

6. **Record the sign-off.** On approval, in `screens.md` set `status: signed-off`, the date, and
   `spec-sha256` to the current hash of `spec.md`, and fill in the sign-off block. Then add (or
   replace) this section at the end of `spec.md`:

   ```
   ## Signed-off screens

   The screens in `screens.md` were signed off by the owner on DATE. Plan, tasks and implementation
   MUST honour them. Any change to an interface covered here MUST update `screens.md` and its
   Penpot frames in the same change (constitution principle V).
   ```

7. **Tell the caller.** Say plainly: "Signed off. You may continue to plan." If the owner did not
   sign off, say: "Not signed off. Do not continue to plan."

## Rules

- Never sign off on the owner's behalf. Only an explicit approval in this step counts.
- Do not write application code or technical design here.
- A change to `spec.md` after sign-off makes the sign-off stale; this step runs again before plan.
