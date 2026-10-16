# Design gates extension

Our own Spec Kit extension (written for this project, so there is no third-party code to vet). It adds
the design steps to the standard flow, in line with constitution principle V.

| Hook | Command | What it does |
|---|---|---|
| after `specify` | `/speckit-screens-draft` | Draws the feature's greyscale **wireframes** in Penpot with real wording, writes `screens.md`, collects the owner's reactions, passes open questions to clarify |
| before `plan` | `/speckit-screens-signoff` | Checks the wireframes against the clarified spec and asks the owner to sign off **structure and wording**; plan must not start without it |
| before `implement` | `/speckit-screens-direction` | Checks the project's **visual direction** (DESIGN.md, PRODUCT.md) is decided and approved by the owner; if not, runs that step (with Impeccable) first |
| after `implement` | `/speckit-screens-review` | **Visual review**: built screens in a real browser against the wireframes, Impeccable critique and audit, owner approves the look |

All hooks are mandatory (`optional: false`).

Install or update (from the project root; see `docs/build-process.md` for how to run `specify` here):

```
specify extension add ./speckit-extensions/screens --dev --force
```

Files
- `extension.yml`: manifest and hooks
- `commands/`: the four commands
- `templates/screens-template.md`: the `screens.md` each feature gets
