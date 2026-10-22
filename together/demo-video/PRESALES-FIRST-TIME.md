# First-time customer presales video

Working production record for a new presales export. The full walkthrough and the existing
`together-presales.mp4` remain source material and are not replaced.

## Stage 1 — source inspection

Completed 22 Oct 2026.

### Why the current cut does not work

The current `together-presales.mp4` is 169.533 seconds. Its source scenes are:

1. `oa-sponsor`
2. `op-game`
3. `sp-sponsor`
4. `oa-sponsor-confirm`
5. `op-home`
6. `card-end`

Sponsor administration, sponsor play, and sponsor confirmation occupy about 95 seconds, more
than half the video. The public Greenwood School website first appears at about 02:10. Website
creation, campaign creation and publication, the sharing kit, a complete supporter
confirmation, vouchers, personal sharing, and post-contribution transparency are absent.

The current file has an English subtitle track and sidecar SRT/VTT files, but the soft
subtitles are not burned into the picture. A review copy confirmed the UI is visually intact.

### Processes and reusable assets

- The Vite app is already running on port 4321. No duplicate server is needed.
- The video HTTP server on port 4391 is unrelated to recording and can remain running.
- No recorder, narrator, Piper, ffmpeg, or assembler process was active at inspection time.
- The isolated full recording completed all scene checks with no console errors.
- Sixty-two assembled source clips remain in `demo-video/work/build/`.
- The existing full walkthrough, presales MP4, subtitles, chapters, and manifest are preserved.

### Source-scene suitability

| Story section | Reusable source scenes | Decision |
| --- | --- | --- |
| Product and audience | `op-home`, `sp-home`, `sp-trust` | Reuse. Start on the public branded website and campaign. |
| Organization website | `oa-details`, `oa-features`, `oa-look`, `oa-review`, `oa-publish`, `op-home` | Reuse selected excerpts. `oa-review` contains desktop/mobile preview. |
| Campaign creation and publication | `og-assistant`, `og-form`, `og-submit`, `og-approve`, `og-copy-link` | Reuse selected excerpts. Describe the assistant as guided and simulated. |
| Sharing | `og-share-qr`, `og-share-poster`, `og-share-messages`, `og-share-social` | Reuse. All use the same recorded campaign URL. |
| Supporter journey | `sp-home`, `sp-direct`, `sp-game`, `sp-game-confirm` | Reuse. Trim repetitive gameplay and keep one meaningful match, edit, confirm, receipt. |
| Sponsor play | `oa-sponsor`, `sp-sponsor`, `oa-sponsor-confirm` | Reuse brief result-focused excerpts; omit the full form. |
| Partner reward | `op-offer`, `sp-reward`, `sp-vouchers`, `mc-redeem` | Reuse. Keep simulated redemption visible. |
| Personal sharing | `sp-share`, `sp-referral-gift` | Reuse the completed page, referral link, and original-campaign attribution. |
| Transparency | `op-update`, `fn-public` | Reuse. These show updates, milestones, reported expense, evidence status, goal reached, and delivery in progress. |
| Closing | `op-home` plus a new Together closing card | Reuse product footage; generate only the requested closing card. |

### Recording decision

The current isolated footage contains every required working product screen and uses one
coherent Greenwood School campaign. No application scene is missing. New browser recording is
not currently required. The only new visual asset should be the requested closing card and a
brief “Later in the campaign” transition.

## Stage 2 — storyboard and source map

Target: approximately 04:30, 1920×1080, 30 fps, English narration and captions.

The new export will be `output/together-presales-first-time.mp4`. It will not replace
`together-presales.mp4` or `together-demo.mp4`.

| Target time | Story beat | Source excerpts | Visible proof |
| --- | --- | --- | --- |
| 00:00–00:20 | The problem and product | `op-home` 00:00–00:10; `sp-home` 00:05–00:10; `sp-trust` 00:00–00:05 | Greenwood branding, campaign purpose, supporter-facing trust content. Add the prototype notice in the caption-safe lower band. |
| 00:20–00:50 | Your organization, your website | `oa-details` 00:00–00:06; `oa-features` 00:20–00:26; `oa-look` 00:00–00:07; `oa-review` 00:05–00:10; `oa-publish` 00:24–00:30 | Name and address, feature choice, colour/logo, mobile preview, published website. |
| 00:50–01:30 | Create and publish | `og-assistant` 00:00–00:08, 00:25–00:31, 00:55–01:01; `og-form` 00:15–00:21; `og-submit` 00:00–00:04; `og-approve` 00:15–00:20 and 00:29–00:34 | Guided assistant, beneficiary/purpose, target, dates, game and update commitment, submission, review, explicit publication. |
| 01:30–01:55 | Share it | `og-copy-link` 00:05–00:09; `og-share-qr` 00:00–00:06; `og-share-poster` 00:00–00:05; `og-share-messages` 00:00–00:05; `og-share-social` 00:10–00:15 | One campaign link, generated QR, poster, message draft, social image. |
| 01:55–02:35 | Supporter experience | `sp-home` 00:05–00:10; `sp-trust` 00:00–00:05; `op-game` 00:00–00:05; `sp-game` 00:05–00:15; `sp-game-confirm` 00:00–00:08 and 00:08–00:15 | Purpose/progress, direct alternative, one concise Memory Match action, suggestion, edited final amount, simulated confirmation, receipt. |
| 02:35–03:00 | Sponsor-funded participation | `oa-sponsor` 00:15–00:20; `sp-sponsor` 00:00–00:15; `oa-sponsor-confirm` 00:04–00:09 | Northwind commitment result, eligible Memory Match, pending reward outside checkout, one confirmation. |
| 03:00–03:25 | Local partner rewards | `op-offer` 00:00–00:05; `sp-reward` 00:00–00:05; `sp-vouchers` 00:00–00:08; `mc-redeem` 00:05–00:12 | Conditions, qualifying reward, store-ready voucher, QR/backup code, simulated redemption. |
| 03:25–03:40 | Personal sharing | `sp-share` 00:20–00:30; `sp-referral-gift` 00:05–00:10 | Mia’s page and referral link; original campaign receives the attributed contribution. |
| 03:40–04:15 | Transparency after giving | 3-second “Later in the campaign” card; `op-update` 00:00–00:08; `fn-public` 00:00–00:08, 00:20–00:28, 00:35–00:43 | Expected update, published update, milestone, reported expense/evidence state, goal reached while delivery remains in progress. |
| 04:15–04:30 | Value and next step | `op-home` 00:00–00:05; 10-second closing card | Branded website, concise value statement, “Explore a pilot for your organization.” |

### Editing rules

- Use clean cuts with short fades only at the “Later in the campaign” and closing cards.
- Do not speed up informational screens. Trim before or after the readable result instead.
- Reframe only when a field, QR, amount, or status is too small at normal playback size.
- Reserve a caption band below the product picture so captions do not cover buttons, totals, or
  game controls.
- Keep Greenwood School, “School supplies for every Greenwood pupil”, the $60,000 target,
  Northwind Stationery, Corner Stationery, Mia’s referral, and the same voucher journey.
- Preserve the demo-control labels when they identify a simulated role, but do not dwell on the
  identity switcher.
- Explain the later jump in progress with the explicit “Later in the campaign” transition.

### Narration

The final narration is in
`narration/presales-first-time.md`. Each non-heading line is one caption cue. It contains 551
spoken words after `{shown|spoken}` substitutions across 46 cues, inside the requested
500–570-word range. The machine-readable
source map is `scripts/presales-first-time.mjs`; its planned excerpts total exactly 270 seconds.

## Stage 3 — source validation and missing visuals

Completed 22 Oct 2026.

- Validated all 40 configured excerpts across 31 source scenes with `ffprobe`.
- Every start/end point falls within its source clip.
- Every section total matches its target and the complete visual plan totals 270 seconds.
- Generated only the missing three-second “Later in the campaign” transition and ten-second
  closing card. No application recorder or duplicate server was started.

## Stage 4 — assembly

Completed 22 Oct 2026.

- `scripts/assemble-presales-first-time.mjs` builds this cut independently of `assemble.mjs`.
- Output: `output/together-presales-first-time.mp4`.
- English narration uses the existing local Piper voice only; no external service was called.
- Captions are burned into the caption-safe lower area and are also embedded as an English
  `mov_text` track. Matching SRT and VTT files sit beside the MP4.
- The MP4 is 1920×1080, 30 fps, H.264 plus AAC, with ten chapter markers.
- `output/together-presales-first-time.assembly.json` records the source excerpts, section
  timeline, sidecars, format, and measured duration.
- `together-demo.mp4` and `together-presales.mp4` were preserved with their earlier timestamps.

## Stage 5 — verification

Visual and technical verification completed 22 Oct 2026, 11:53 AM IST. Audible review remains
blocked.

- Exact probed duration: **270.000 seconds (04:30.000)**.
- Streams: 1920×1080 H.264 at 30 fps, English AAC audio, English `mov_text` subtitles, and
  chapter metadata.
- A complete visual review confirmed all ten story sections, readable UI and captions, no black
  frames, missing media, debug screens, or broken transitions. Sponsor play occupies 25 seconds
  and does not dominate.
- Representative frames at 00:05, 00:25, 01:35, 02:05, 02:35, 03:25, 03:55, 04:25, and 04:29
  were checked at full export resolution.
- Frame analysis found no black intervals and no unintended freezes of 12 seconds or longer.
- Technical audio analysis measured a −4.24 dBFS peak and −20.69 dBFS RMS, with no clipping. The only
  silences longer than two seconds were three intentional reading pauses of about 3.16 seconds
  during website setup.
- All 46 caption windows are ordered and non-overlapping. Every window contains narration
  (cue peaks −4.51 to −4.48 dBFS; RMS −22.63 to −17.53 dBFS), because timings are generated
  from the exact sentence audio used in the final track.
- The opening explains the product and audience within 20 seconds. Simulated payment, guided
  assistant, sponsor-fund confirmation, redemption, and browser-local limitations remain
  explicit. The pending sponsor reward is not presented as received funds.
- The final value statement and “Explore a pilot for your organization” CTA are readable.

The concise verification record is
`output/together-presales-first-time.verification.md`. That review predates the change from
Indian rupees to dollars. The export still shows rupees, so it is stale and is not marked Complete.
