# Privacy Policy

**Last updated:** August 17, 2026

This page explains what information this website collects, why, and what happens to it. It's
written in plain language because this is a personal portfolio site, not a company — there's no
legal or compliance department behind it, just me.

## Who this applies to

This policy covers **Chin Yi Zhe's** personal portfolio website (this site). I run it myself, on
infrastructure I self-host. It is not operated by a company or organization.

## What information I collect

There are two places this site asks you to identify yourself: the **"Request resume" form**, and
the **"Interested in working together?" form** near the bottom of the homepage.

When you submit the resume request form, I collect:

- **Name** — so I know who's asking and can address you by name in a reply.
- **Email address** — so I can send you the resume link if your request is approved.
- **Company** — so I have context on who's asking and why.
- **Reason** *(optional free-text field)* — anything you choose to tell me about why you want the
  resume (e.g. "hiring for a backend role").

When you submit the "Interested in working together?" form, I collect:

- **Email address** *(required)* — so I can reply to you.
- **Message** *(required free-text field)* — what you want to tell me (a role, a project idea, or
  just saying hi). Required so submissions actually have enough context for me to act on.
- **Name** *(optional)* — so I know who's writing, if you'd like to share it.

Unlike the resume form, submitting this one doesn't trigger any automatic email back to you — it
adds your message to a list I check and reply to manually.

I don't use cookies, analytics trackers, or any similar tracking technology anywhere on this
site, and nothing outside those two forms asks you to identify yourself.

That said, two things happen automatically as part of running any website — worth naming even
though neither one identifies you:

- **Server access logs.** Like virtually every web server, mine logs each request's IP address,
  the page requested, and a timestamp. This is how I catch abuse and debug problems, not how I
  track visitors — it's not tied to anything you submit through the resume form. These logs are
  kept for 14 days and then automatically deleted.
- **Blog post ratings.** If you click a star to rate a post, that vote is anonymous — I only ever
  store the running total and count, never anything tied back to you. To stop the same visitor
  voting on a loop, the vote is checked against a one-way hash of your IP address (not the
  address itself, and not reversible back into one) that expires after 24 hours. Your own browser
  also remembers your vote locally, on your device only, so the button doesn't ask you to vote
  again on a repeat visit.

## Why I collect it

I collect this information for one purpose: **to decide whether to send you my resume, and to
send it to you if I do.** The full resume isn't published publicly on the site — access is
gated behind this request form so I have some visibility into who's asking.

Specifically, your submitted information is used to:

1. Let me review the request and decide whether to approve or decline it.
2. Generate and send you a download link (expires 24 hours after it's sent) if approved.
3. Contact you about your request (e.g. to follow up or ask a clarifying question).

I don't use this data for marketing, don't add you to a mailing list, and don't use it for
anything unrelated to your resume request.

The "Interested in working together?" form serves the same kind of purpose, just simpler:
**so I can read what you sent and reply to you directly.** There's no approve/decline step and,
unlike the resume form, no AI processing involved (see the next section) — your submission just
lands in a list I check manually and respond to by email myself.

## Automated triage with an AI model

**This section applies only to the resume request form.** The "Interested in working together?"
form is never processed by an AI model — it goes straight into a list only I read.

> **A human (me) makes the actual approve/decline decision.** The AI does not autonomously
> approve, decline, or send anything — it only helps me review faster.

Before I manually review each resume request, it's processed by an AI model (currently
**Claude Haiku, via the Anthropic API**) to help me summarize and flag submissions — for example,
surfacing a short summary or flagging spam-like submissions — so I can review requests faster.

This means the contents of your resume request (name, email, company, and reason) are sent to
Anthropic's API as part of that automated step. A few relevant points about that:

- Anthropic states that it does **not** use data submitted through its commercial API to train
  its models by default.
- Anthropic retains API data only as needed to operate the service (e.g. abuse/safety
  monitoring) — see Anthropic's own [Privacy Policy](https://privacy.claude.com) and
  [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) for their current,
  authoritative retention and usage terms, since those may change over time and this page won't
  always be updated the same day they do.
- This is currently the **only** third party that sees data submitted through the resume request
  form, and it's never sent anything from the "Interested in working together?" form (see
  "Sharing" below).

## Sharing — who else sees this data

I don't sell your data. I don't share it with advertisers, data brokers, or anyone else for
marketing purposes. The only place your submitted information goes, besides my own review, is:

- **Anthropic** (the AI triage step described above) — resume requests only, never the
  "Interested in working together?" form.
- **My email provider**, if your resume request is approved — sending you the resume link
  requires sending an email, which necessarily passes through whatever SMTP/email service I use.
  A "working together" submission doesn't trigger an outbound email at all — I reply manually,
  if and when I do.
- **Service providers that keep the site running** — e.g. the hosting infrastructure and
  database (SQLite) that store the submission while it's pending review. These are
  infrastructure I run myself, not third parties I hand data to; see the technical note below.

I don't share your data with any other third party, and I don't use it to build advertising
profiles or sell it in any form.

## How long I keep your data

> **Your identifying data is permanently erased 30 days after you submit either form** —
> automatically, regardless of status (approved, declined, contacted, or never resolved). This
> isn't a plan; it's already running on every submission.

For a **resume request**, that means your name and email are cleared 30 days after submission.
What's kept afterward is limited to non-identifying information — the company name, your stated
reason, the request's status, and the AI legitimacy verdict — so I can still see aggregate trends
(how many requests come in, from which companies, for what roles, how many convert) without
retaining anyone's personal contact information.

For a **"working together" submission**, the same 30-day clock clears your name, email, *and*
message — there's no non-identifying remainder kept for that form, since the message itself is
free text that could contain identifying details. Only the row's status (new / contacted /
archived) and submission date survive.

If you'd like your data erased sooner than 30 days, email me at **yzportal123@gmail.com** and
I'll remove it manually.

## Your rights

I haven't formally determined which specific data-protection regime (e.g. EU/UK GDPR, U.S.
state laws like the CCPA/CPRA) applies to this site — it's a personal project, not a company
with a legal team, and I'm not making a specific compliance claim either way here.

Regardless of what's legally required, as a matter of practice I will honor any reasonable
request to:

- See what data I have about you,
- Correct inaccurate data, or
- Delete your data,

if you email me at **yzportal123@gmail.com**.

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

Questions about this policy, or a request regarding your data?

---

*This policy was drafted with AI assistance. It isn't a substitute for legal advice from a
licensed attorney.*
