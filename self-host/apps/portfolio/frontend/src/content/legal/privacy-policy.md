<!--
DRAFT — NOT LEGAL ADVICE.
Prepared by an AI assistant (Claude) as a starting point for the site owner to review, edit,
and sign off on. This is not legal advice and no attorney-client relationship is created by
this document. Sections marked [CONFIRM] contain open questions the site owner should
resolve — most importantly, which jurisdiction's laws (if any) apply to this site (see the
"Your rights" section) — rather than assumptions made on the owner's behalf.

Last drafted: 2026-07-28. Replace this comment block (and the "Last updated" line below)
once reviewed, and delete this notice before publishing.
-->

# Privacy Policy

**Last updated:** [DATE — fill in when published]

This page explains what information this website collects, why, and what happens to it. It's
written in plain language because this is a personal portfolio site, not a company — there's no
legal or compliance department behind it, just me.

## Who this applies to

This policy covers **[YOUR NAME]'s** personal portfolio website (this site). I run it myself, on
infrastructure I self-host. It is not operated by a company or organization.

## What information I collect

The only personal information this site collects is through the **"Request resume" form**. When
you submit that form, I collect:

- **Name** — so I know who's asking and can address you by name in a reply.
- **Email address** — so I can send you the resume link if your request is approved.
- **Company** — so I have context on who's asking and why.
- **Reason** *(optional free-text field)* — anything you choose to tell me about why you want the
  resume (e.g. "hiring for a backend role").

I don't use cookies, analytics trackers, or any other method to collect personal data on this
site outside of that form. Visiting the site to read about my projects doesn't send me anything
about you.

## Why I collect it

I collect this information for one purpose: **to decide whether to send you my resume, and to
send it to you if I do.** The full resume isn't published publicly on the site — access is
gated behind this request form so I have some visibility into who's asking.

Specifically, your submitted information is used to:

1. Let me review the request and decide whether to approve or decline it.
2. Generate and send you a time-limited download link if approved.
3. Contact you about your request (e.g. to follow up or ask a clarifying question).

I don't use this data for marketing, don't add you to a mailing list, and don't use it for
anything unrelated to your resume request.

## Automated triage with an AI model

Before I manually review each request, it's processed by an AI model (currently **Claude Haiku,
via the Anthropic API**) to help me summarize and flag submissions — for example, surfacing a
short summary or flagging spam-like submissions — so I can review requests faster. **A human
(me) makes the actual approve/decline decision; the AI does not autonomously approve, decline, or
send anything.**

This means the contents of your submission (name, email, company, and reason) are sent to
Anthropic's API as part of that automated step. A few relevant points about that:

- Anthropic states that it does **not** use data submitted through its commercial API to train
  its models by default.
- Anthropic retains API data only as needed to operate the service (e.g. abuse/safety
  monitoring) — see Anthropic's own [Privacy Policy](https://privacy.claude.com) and
  [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) for their current,
  authoritative retention and usage terms, since those may change over time and this page won't
  always be updated the same day they do.
- This is currently the **only** third party that sees your submitted data as part of processing
  your request (see "Sharing" below).

## Sharing — who else sees this data

I don't sell your data. I don't share it with advertisers, data brokers, or anyone else for
marketing purposes. The only place your submitted information goes, besides my own review, is:

- **Anthropic** (the AI triage step described above).
- **My email provider**, if your request is approved — sending you the resume link requires
  sending an email, which necessarily passes through whatever SMTP/email service I use.
- **Service providers that keep the site running** — e.g. the hosting infrastructure and
  database (Redis) that store the submission while it's pending review. These are
  infrastructure I run myself, not third parties I hand data to; see the technical note below.

I don't share your data with any other third party, and I don't use it to build advertising
profiles or sell it in any form.

## How long I keep your data

Requests are stored (in a self-hosted database) from the moment you submit the form until
they're either approved and fulfilled, declined, or otherwise resolved. After that:

> **[CONFIRM — retention window not yet finalized.]** My current plan is to delete or
> anonymize (remove your name, email, and reason, keeping only non-identifying record like
> "approved" / "declined" and a date) resolved requests **90 days** after they're resolved.
> Until this is implemented and confirmed, treat any submission as retained until I manually
> delete it. If you'd like your data deleted sooner, email me at **[YOUR EMAIL]** and I'll
> remove it.

See the accompanying engineering note (separate from this policy) for the technical plan behind
this — it isn't live yet as of this draft.

## Your rights

> **[CONFIRM — jurisdiction not yet determined.]** Depending on where you and I are each
> located, you may have specific legal rights over your data (for example, under the EU/UK
> GDPR or U.S. state laws like the CCPA/CPRA). I haven't yet determined which of these regimes,
> if any, formally apply to this site, and I'm not asserting that none do — this is flagged here
> as an open item for me to resolve, not a claim that no rights apply to you.

Regardless of what's legally required, as a matter of practice I will honor any reasonable
request to:

- See what data I have about you,
- Correct inaccurate data, or
- Delete your data,

if you email me at **[YOUR EMAIL]**.

## Data security

This site is self-hosted on hardware I personally operate. I take reasonable steps to secure it
(e.g. access controls on the admin panel, not exposing the storage layer publicly), but as with
any individually-operated system, I can't offer the kind of formal security guarantees a company
with a dedicated security team might. If you have sensitive concerns about submitting your
information, please reach out before doing so.

## Children's privacy

This site isn't directed at children, and I don't knowingly collect information from anyone
under 16 (or the relevant age of consent in your jurisdiction). If you believe a child has
submitted information here, contact me and I'll remove it.

## Changes to this policy

I may update this policy as the site changes (e.g. if the AI triage step changes, or if I add
new data collection). I'll update the "Last updated" date above when I do. Material changes will
be reflected here — there's no separate mailing list to notify, since I don't currently collect
emails for anything but resume requests.

## Contact

Questions about this policy, or a request regarding your data? Email me at **[YOUR EMAIL]**.

---

*This policy was drafted with AI assistance and is provided as a starting point, not as legal
advice. Sections marked [CONFIRM] need the site owner's input before this is considered final —
in particular, confirming which jurisdiction's data-protection laws apply, and finalizing the
retention window described above.*
