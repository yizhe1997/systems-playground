# Owner decisions and reactions

Answers to `11-react-to-this.md`, recorded as given. Dated 2026-10-02. These are reactions to examples, not final specs; each can change after seeing it built.

## Who it is for
- **Primary story: B, the few-trades day trader**, for the long term. The owner will also try other kinds of trading in parallel and later, so other styles must not be designed out.

## The ten ideas

| # | Idea | Reaction | Notes |
|---|---|---|---|
| 1 | Yesterday's focus shows today | **Day one** | Needed an explanation first; then yes. |
| 2 | Plan down, reflect up | **Day one** | |
| 3 | Grade the decision, not the result | **Day one** | |
| 4 | Mistake counter with a stop line | **Day one** (tagging and counter) | Asked first how mistakes are stored. Answer given: a mistake is a tag on a trade, or one tag per session for habits not tied to a trade. |
| 5 | Pre-trade gate | **Day one** | Asked how the plain gate works, and wants any agent involvement **on request only, to save tokens**. |
| 6 | Live session log | **Day one** | Needed the example inside the question; then yes. |
| 7 | Prop challenge cockpit | **Day one** | |
| 8 | Import as a conversation | **Day one**, with a twist (below) | |
| 9 | Setup playbooks and analytics | **Day one** | |
| 10 | Missed trades | **Day one** | |

**Import twist (owner's design):** reuse the AI-mapping idea from Tradecraft v1, but smarter. When the AI works out how a file maps to trades, it saves that as a **reusable import profile**. Next time a file of the same shape arrives, the profile is applied and **verified** (checked against the file) with no AI call. Only when verification fails or no profile fits does the AI propose a new mapping, which then becomes a new profile. AI is the fallback, not the default.

## Ideas that are ours (agents and MCP)

| | Idea | Reaction |
|---|---|---|
| A | Draft review an agent writes for you to edit | **Later** |
| B | Ask your journal anything (from a chat or coding agent) | **Want it** |
| C | Rule Replay and Edge Leak quoted in agent answers | **Want it** (keep the feature and expose it to agents) |
| D | Log a trade by talking or screenshot | **Later** |
| E | Gate asked by an agent | **On request only, not always on** (token cost) |
| F | Agent control level | **Read plus drafts**: agents read and write drafts; the owner approves anything that becomes real |

## Order

- **First usable version: "Journal and reflect"** (ideas 1 to 4: log trades, daily review with yesterday's focus, plan-down focus fields, process grades, mistake tags and counter with an optional stop line).
- **Second: no preference yet.** Candidates are the live session (gate and log), import with reusable profiles, and the prop cockpit. Decide after the first version is in use.
- **Agent and MCP read access (ideas B and C): after the first version.** Cheap once the API exists, since it only reads.
- Ideas 9 (setup playbooks) and 10 (missed trades) were day one in spirit but are not in the first version; they slot into the second or third slice. A and D are later; E is on request only; F is read plus drafts.

## What this adds up to

Nearly everything was wanted, so the work is sequencing. The first version is deliberately small and sits on the foundation Tradecraft v1 already has.

## Design process decisions (2026-10-02)

- **Wireframes are greyscale and assume no look.** The first draft of feature 001 used Tradecraft v1's palette and type without asking; that was a mistake and has been set aside.
- **Three separate design decisions:** wireframes (structure and wording, signed off before plan), visual direction (the look, decided once per project by the owner, approved before the first implement), and visual review (built screens in a browser, approved after implement).
- **Impeccable** is used for the visual direction (`init`, `document`), optionally at plan (`shape`), as implementation guidance, and in the visual review (`critique`, `audit`, `polish`).
- The owner can provide design references whenever the visual direction is decided; code cannot start without it. Constitution amended to 1.1.0.
