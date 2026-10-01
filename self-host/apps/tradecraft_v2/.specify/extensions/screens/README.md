# Screens extension

Our own Spec Kit extension (written for this project, so there is no third-party code to vet). It adds
two steps to the standard flow, in line with constitution principle V (design before code):

| Hook | Command | What it does |
|---|---|---|
| after `specify` | `/speckit-screens-draft` | Drafts the feature's screens in Penpot with real wording, writes `screens.md`, collects the owner's reactions, and hands the open questions to clarify |
| before `plan` | `/speckit-screens-signoff` | Checks the screens against the clarified spec and asks the owner to sign off; plan must not start without it |

Both hooks are mandatory (`optional: false`).

Install (from the project root; see `docs/build-process.md` for how to run the `specify` tool on this
machine):

```
specify extension add screens --dev ./speckit-extensions/screens
```

Result: the commands are registered as skills in `.claude/skills/` and the hooks are written to
`.specify/extensions.yml`. Keep this source folder under version control; re-run the command with
`--force` after editing it.

Files
- `extension.yml`: the manifest and hooks
- `commands/`: the two commands
- `templates/screens-template.md`: the `screens.md` that each feature gets
