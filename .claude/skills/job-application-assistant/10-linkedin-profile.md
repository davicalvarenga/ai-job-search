---
framework_version: 1.0.0
---

# LinkedIn Profile

Recruiters search LinkedIn before they open a CV, and many find the candidate there first. This file governs reviewing and drafting the profile: headline, About, experience, education, skills, and outreach messages. Like `08-application-forms.md`, the output is text the candidate pastes, never something Claude publishes.

## Ground rules

- **Facts come only from `01-candidate-profile.md`.** The profile and the CV must not contradict each other (titles, dates, language levels, metrics). A recruiter who opens both and finds a mismatch trusts neither.
- **Claude drafts, the candidate posts.** Never edit the live profile, send connection requests, or message anyone on the candidate's behalf.
- **Write in the profile's language.** LinkedIn supports a secondary-language profile: keep the primary in the language of the target market and add a secondary one (usually English) instead of deleting the primary.
- Save drafts under `documents/linkedin/` (personal, ignored by git).

## Headline

The headline appears in search results, connection suggestions and every comment, and its keywords feed LinkedIn search.

- Formula: **role + key technologies + value or focus**, e.g. `Backend Developer | Node.js · TypeScript | Turning manual processes into automation`.
- Name the role the candidate is targeting or holds; `Role @ Company` works when currently employed in it.
- State a level only if it is true (`Junior`, `Intern`); never `Senior` or `Specialist` without the experience behind it.
- Lead with the stack the target postings ask for; LinkedIn truncates long headlines in search results.

## About

Structure, in this order:

1. **Greeting and who you are** in one or two sentences.
2. **What drives you**: the kind of problem the candidate enjoys solving.
3. **Short career story**: how they got here, briefly.
4. **What you built**: 3-5 bullets with concrete results (the same CAR facts as the CV, see `03-writing-style.md`).
5. **Stack**: one line of keywords matching target postings (this is in-profile SEO).
6. **A personal touch** (optional): one line that shows personality.
7. **Call to action**: what kind of role they are open to and how to reach them (message, GitHub, portfolio link).

Plain language, no jargon walls, no cliches (same banned list as `03-writing-style.md`).

## Experience

- **Max 3 bullets per role**, each in CAR form: problem, action with the tool, result. A recruiter wants to see the candidate's delivery, not the job description.
- One-line context sentence before the bullets is fine (team, type of company).
- Tag the skills used in each role; LinkedIn links them to the Skills section.
- Show promotions and scope changes explicitly.
- Mix in soft skills through the bullets (collaboration, ownership), never as adjectives alone.

## Education

Beyond the degree title, add what differentiates: awards, relevant projects, extracurricular activities, thesis or final project, standout courses. For a current student, the end date is the expected graduation.

## Skills

LinkedIn Recruiter filters candidates by Skills, so this section is a search filter, not decoration.

- Use the exact terms target postings use (`Node.js`, not `Node`).
- Pin the 5 most relevant to the target role as top skills; reorder when the target changes.
- Cover technical, interpersonal and leadership skills, but keep every one defensible in an interview.
- Ask colleagues for endorsements on the top skills; endorse theirs.

## Photo and banner

- **Photo:** face clearly framed, high resolution, neutral background, natural light, natural smile. Selfies and casual photos hurt more than no photo helps.
- **Banner:** current employer's banner, a personal-brand banner, or a neutral tech image, in that order of preference.

## Activity and network

These are habits, not profile fields; suggest them, never automate them.

- **Posts:** share projects and results (what was built, the problem, the stack, a link). Projects with a public repo are the strongest material for an early-career candidate.
- **Comments:** add something useful on posts from recruiters and people in the target area.
- **Connections:** quality over count. Prioritize recruiters in the target area (search terms like `Tech Recruiter`, `Talent Acquisition`), people in the role the candidate wants, and leaders in the field.
- **Recommendations:** ask for specific ones ("could you recommend me for the X project we did at Y?") and write them for others.

## Outreach messages

Always personalized; a generic request gets ignored. Keep under 300 characters for a connection note.

**Connection request:**
```
Hi [Name]! I saw [their post / their work at Company / their talk on X] and [one genuine reason it is relevant]. I'm [role/student] working with [stack] and would like to keep in touch.
```

**After applying to a posting:**
```
Hi [Name], how are you? I applied for the [Role] position at [Company] and wanted to reinforce my interest. [One sentence connecting a concrete result of mine to the role.] Happy to talk whenever suits you.
```

Record the person contacted in the `contact_person` column of `job_search_tracker.csv`.

## Profile review output

When asked to review a profile, report a pass/fail list per section above, quote the current text next to the proposed text, and flag every contradiction with the CV or `01-candidate-profile.md` first.
