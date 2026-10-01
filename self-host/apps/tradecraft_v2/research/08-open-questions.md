# Open questions for the owner

Ordered by what blocks the v2 spec. Each has my lean, so a quick yes or no is enough.

## A. Who and what is it for

1. **Your actual weekly routine.** Before modules: describe a normal trading day and a normal review (even in bullets). Every module below is judged against it. *(No lean: only you know.)*
2. **Futures only, or other assets too?** Futures-only cuts forex, options, crypto and stock fields from the trade model. *Lean: futures only for v2.*
3. **How many prop accounts, and which firms?** Decides how deep the prop-challenge module goes. *Lean: start with rules and phases, add payouts only if you actually request them.*
4. **Personal tool or something you might share?** Affects licence thinking and how much onboarding it needs. *Lean: personal first.*

## B. Review and reflection

5. **Review cascade yes or no?** Daily detailed, higher levels carry context and numbers upward. *Lean: yes.*
6. **Which levels?** *Lean: daily and weekly first; monthly and yearly as roll-ups later; quarterly dropped.*
7. **Grades and demon tracker?** *Lean: yes to both; small and useful.*
8. **Checklists and choice answers:** keep as reusable prompts, or only free text plus grades? *Lean: a fixed daily prompt set, extra prompts optional.*
9. **Standalone Notebook?** The RP has none; notes attach to days, trades, setups, reviews. *Lean: drop it; use notes on things.*

## C. Live-day process

10. **Session mode and trade gate:** want them? *Lean: yes, as a later module; design the data model now so an agent can use it.*
11. **Session log with tilt alert?** *Lean: yes.*

## D. Trades and data

12. **Missed trades first class?** *Lean: yes, same record with a type and reason.*
13. **Custom fields on trades?** *Lean: not in the first cut.*
14. **Import:** which brokers do you really use (Tradovate, TopstepX, Rithmic, NinjaTrader, others)? Deterministic adapters for those, AI mapping only for unknown files. *Lean: that.*

## E. AI and MCP (the differentiator)

15. **What should an AI be allowed to do?** Read only (summarise, find patterns, draft the daily review), or write too (log a trade from a screenshot, tag, answer the gate)? *Lean: read-only plus drafts the owner approves, behind scoped tokens.*
16. **Where does AI run?** Your own agent through MCP, or a built-in model call? *Lean: MCP-first; no built-in model calls beyond import mapping.*

## F. Process

17. **Spec-kit shape:** the modified spec kit should end every spec with a thin working slice (one trade in, one review out) before wireframes for everything else. *Lean: yes.*
18. **When do we review together?** *Lean: at the end of each spec phase, with a written decision list like today's.*
