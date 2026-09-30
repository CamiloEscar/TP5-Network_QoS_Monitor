# Skill Registry — TP5-Network_QoS_Monitor

Generated: 2026-09-29 · Mode: engram · Project-level skills: none

Deduplicated by name (project-level wins). `sdd-*`, `_shared`, `skill-registry` excluded.

## Project conventions (always relevant)

| Name      | Path        | When                                                                                                                    |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| AGENTS.md | `AGENTS.md` | Expo v57 docs must be read before writing Expo code; never build after changes; conventional commits, no AI attribution |
| CLAUDE.md | `CLAUDE.md` | `@AGENTS.md` index                                                                                                      |

## SDD workflow (sub-agent phases, orchestrator-resolved)

| Name             | Path                                                      |
| ---------------- | --------------------------------------------------------- |
| sdd-orchestrator | `C:\Users\camil\.claude\skills\sdd-orchestrator\SKILL.md` |
| sdd-init         | `C:\Users\camil\.claude\skills\sdd-init\SKILL.md`         |
| sdd-explore      | `C:\Users\camil\.claude\skills\sdd-explore\SKILL.md`      |
| sdd-propose      | `C:\Users\camil\.claude\skills\sdd-propose\SKILL.md`      |
| sdd-spec         | `C:\Users\camil\.claude\skills\sdd-spec\SKILL.md`         |
| sdd-design       | `C:\Users\camil\.claude\skills\sdd-design\SKILL.md`       |
| sdd-tasks        | `C:\Users\camil\.claude\skills\sdd-tasks\SKILL.md`        |
| sdd-apply        | `C:\Users\camil\.claude\skills\sdd-apply\SKILL.md`        |
| sdd-verify       | `C:\Users\camil\.claude\skills\sdd-verify\SKILL.md`       |
| sdd-archive      | `C:\Users\camil\.claude\skills\sdd-archive\SKILL.md`      |

## Coding / engineering

| Name                    | Path                                                                                                                              | Trigger                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ponytail                | `C:\Users\camil\.cache\opencode\packages\@dietrichgebert\ponytail\node_modules\@dietrichgebert\ponytail\skills\ponytail\SKILL.md` | Any coding task: write, add, refactor, fix, review, design code; YAGNI/lazy/simplify. ACTIVE (full) |
| ponytail-review         | `...\skills\ponytail-review\SKILL.md`                                                                                             | Review for over-engineering / what to delete                                                        |
| ponytail-audit          | `...\skills\ponytail-audit\SKILL.md`                                                                                              | Whole-repo over-engineering audit                                                                   |
| ponytail-debt           | `...\skills\ponytail-debt\SKILL.md`                                                                                               | Harvest `ponytail:` comments into debt ledger                                                       |
| ponytail-gain           | `...\skills\ponytail-gain\SKILL.md`                                                                                               | Ponytail impact scoreboard                                                                          |
| ponytail-help           | `...\skills\ponytail-help\SKILL.md`                                                                                               | Ponytail command reference                                                                          |
| go-testing              | `C:\Users\camil\.claude\skills\go-testing\SKILL.md`                                                                               | Go tests, Bubbletea TUI testing                                                                     |
| security-audit          | `C:\Users\camil\.config\opencode\skills\security-audit\SKILL.md`                                                                  | Security questions, vuln review, pen tests, audits                                                  |
| skill-creator           | `C:\Users\camil\.claude\skills\skill-creator\SKILL.md`                                                                            | Create new AI agent skills                                                                          |
| customize-opencode      | `<built-in>`                                                                                                                      | Editing opencode's own config/agents/skills/plugins                                                 |
| full-output-enforcement | `C:\Users\camil\.agents\skills\full-output-enforcement\SKILL.md`                                                                  | Exhaustive, unabridged code generation                                                              |
| engram-protocol         | `C:\Users\camil\.claude\skills\engram-protocol\SKILL.md`                                                                          | Persist/recall across sessions; session lifecycle                                                   |

## Verification / automation

| Name               | Path                                                        | Trigger                                                                  |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| browser-automation | `C:\Users\camil\.claude\skills\browser-automation\SKILL.md` | Load page headless, report console errors / failed requests / screenshot |
| game-development   | `C:\Users\camil\.claude\skills\game-development\SKILL.md`   | Run the game/mod and look at it instead of reading source                |
| find-skills        | `C:\Users\camil\.agents\skills\find-skills\SKILL.md`        | Discover/install agent skills                                            |

## Design / frontend taste

| Name                       | Path                                                                | Trigger                                                |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| design-taste-frontend      | `C:\Users\camil\.agents\skills\design-taste-frontend\SKILL.md`      | Landing pages, portfolios, redesigns (v2 default)      |
| design-taste-frontend-v1   | `C:\Users\camil\.agents\skills\design-taste-frontend-v1\SKILL.md`   | v1 exact-backward-compat only                          |
| redesign-existing-projects | `C:\Users\camil\.agents\skills\redesign-existing-projects\SKILL.md` | Upgrade existing site/app to premium                   |
| high-end-visual-design     | `C:\Users\camil\.agents\skills\high-end-visual-design\SKILL.md`     | Expensive-feeling design systems                       |
| minimalist-ui              | `C:\Users\camil\.agents\skills\minimalist-ui\SKILL.md`              | Clean editorial UI, warm monochrome, flat bento        |
| industrial-brutalist-ui    | `C:\Users\camil\.agents\skills\industrial-brutalist-ui\SKILL.md`    | Swiss print + military terminal, data-heavy dashboards |
| stitch-design-taste        | `C:\Users\camil\.agents\skills\stitch-design-taste\SKILL.md`        | Google Stitch DESIGN.md anti-generic standards         |
| gpt-taste                  | `C:\Users\camil\.agents\skills\gpt-taste\SKILL.md`                  | GSAP scroll, AIDA, gapless bento, editorial type       |

## Image generation (not code)

| Name                     | Path                                                              | Trigger                                               |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------- |
| brandkit                 | `C:\Users\camil\.agents\skills\brandkit\SKILL.md`                 | Brand-guidelines boards, logo systems, identity decks |
| image-to-code            | `C:\Users\camil\.agents\skills\image-to-code\SKILL.md`            | Generate design image first, then implement to match  |
| imagegen-frontend-web    | `C:\Users\camil\.agents\skills\imagegen-frontend-web\SKILL.md`    | One horizontal image per website section              |
| imagegen-frontend-mobile | `C:\Users\camil\.agents\skills\imagegen-frontend-mobile\SKILL.md` | Mobile screen concepts in phone mockups               |
| scroll-world             | `C:\Users\camil\.config\opencode\skills\scroll-world\SKILL.md`    | Scroll-scrubbed fly-through-the-world landing page    |

## Relevance to this project

Primary: `ponytail` (always), `engram-protocol` (persistence), `sdd-*` (workflow), `AGENTS.md` (Expo 57 docs).
Secondary when UI work lands: `minimalist-ui` / `high-end-visual-design` / `redesign-existing-projects` (etapa 5 mapa+charts).
Not applicable here: go-testing, game-development, imagegen-* (unless demo/UI mockups requested).
