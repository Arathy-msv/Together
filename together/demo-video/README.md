# Together — narrated demo video

Scripts that record the real running app across all five demo roles, narrate it with a local
offline voice, and assemble a 1080p walkthrough: "Greenwood School raises funds for school
supplies."

Everything here runs locally. No video is uploaded or published, and no cloud or paid TTS
service is called.

## What gets produced

All media goes to ignored folders (`work/` and `output/`); only scripts and docs are committed.

| File | What it is |
| --- | --- |
| `output/together-demo.mp4` | Main walkthrough, 1920×1080, 30 fps, H.264 + AAC, soft English subtitles, chapter markers |
| `output/together-demo.en.srt` | English subtitles |
| `output/together-presales.mp4` (+ `.en.srt`) | Short presales cut: the scenes listed in `scripts/presales.mjs`, same recording and narration |
| `output/together-presales-first-time.mp4` (+ `.en.srt` and `.en.vtt`) | Four-and-a-half-minute first-time customer journey with burned and soft English captions |
| `output/chapters/NN-<chapter>.mp4` (+ `.en.srt`) | One clip per chapter: opening preview, Platform Admin, Organization Admin, Campaign Organizer, Supporter, Merchant, Delivery and reporting |
| `output/scene-timings.md` | The narration script with the final start and end time of every scene |
| `output/assembly-report.json` | Durations, any scenes played faster, and console errors found during recording |
| `narration/script.md` | Editable narration (one line = one subtitle cue) |
| `narration/scene-timings.md` | Committed copy of the timed script from the last assembly |
| `FEATURE-STATUS.md` | What works, and what is missing, limited or simulated |

## Requirements

* Node 22 or newer (uses the built-in `WebSocket` and `fetch`)
* Google Chrome (driven headless through the DevTools protocol)
* ffmpeg and ffprobe with libx264
* For narration, either your own recordings or [Piper](https://github.com/OHF-Voice/piper1-gpl):

```bash
python3 -m venv /tmp/ttsvenv && /tmp/ttsvenv/bin/pip install piper-tts
mkdir -p /tmp/voices && cd /tmp/voices
curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx
curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx.json
```

Override the paths with `PIPER_PYTHON`, `PIPER_VOICE` and `PIPER_LENGTH_SCALE` (default 1.08,
slightly slower than the voice's natural pace).

## Running it

Start the app first (from the project root): `npm run dev` serves it on http://127.0.0.1:4321.
Then, from `demo-video/scripts/`:

```bash
node narrate.mjs     # 1. narration per scene → work/narration (durations, sentence timings)
node record.mjs      # 2. full recording in a fresh, isolated Chrome profile (about 20 minutes)
node assemble.mjs    # 3. title cards, clips, subtitles, chapters → output/
```

Checking flows without capturing video:

```bash
DRY=1 node record.mjs                     # every scene, fast, one screenshot per scene in work/recording/checks
DRY=1 FROM=sp-home node record.mjs        # resume from the checkpoint saved before a scene
DRY=1 UNTIL=oa-publish node record.mjs    # stop after a scene
```

## How the recording stays isolated and honest

* The recorder starts its own headless Chrome with a throwaway profile in
  `work/chrome-demo-profile`, wiped before every run. Your normal browser's saved campaigns and
  contributions are never read or changed.
* The connected flow (supporter claims a voucher, merchant redeems it) runs in that one browser
  context, because all data is localStorage-based. The narration says it does not work across
  devices.
* Scenes are real clicks and typing in the app (`scripts/scenes.mjs`). The only overlay is a
  pointer with a click ripple. Steps marked `record: false` prepare demo data off camera with
  the app's own modules, acting as the person who would do it: the people, last term's campaign,
  and the later contributions that take the campaign past its target.
* Every scene checks what the app shows (for example "No payment will be collected.", a second
  redemption is blocked, the duplicate has no contributions, the final report stays a draft) and
  the run fails rather than recording a wrong result.
* Console errors are collected per scene and listed in `output/assembly-report.json`.
* The video never shows a terminal, developer tools or credentials; the app runs headless.

## Voice and timing

* Voice order: your recording in `narration/recordings/<scene-id>.wav` (or `.mp3`/`.m4a`) wins;
  otherwise local Piper TTS with one voice for the whole video: `en_US-ljspeech-high`, trained on
  the public-domain LJ Speech dataset. It does not imitate any specific person.
* Each scene holds the live screen until its narration has finished (narration length + 1.2 s),
  so narration is never cut or sped up.
* The screen is never sped up, so typed text and each click stay readable. A scene holds on the
  live page until its narration has finished. The audio is never sped up.
* No background music is used.

## Editing the narration

Edit `narration/script.md`, then rerun all three steps. Scene ids must match
`scripts/scenes.mjs`; `card-*` scenes are title cards (their text is in `scripts/cards.mjs`).
Use `{shown|spoken}` when subtitles and speech should differ, e.g. `{₹200|two hundred rupees}`.

## Presales cut

`assemble.mjs` also writes `output/together-presales.mp4` from the scene ids in
`scripts/presales.mjs`. It reuses the full recording and narration, so there is nothing extra to
record. Pick scenes whose narration stands on its own (the first sentence names who is acting).
Assembly stops if a listed id is not in `narration/script.md`.

## Scene checklist

What each part of the walkthrough must show. `scenes.mjs` checks these on screen and fails the
run instead of recording a wrong result.

| Scenes | Must show |
| --- | --- |
| `oa-features` | Recommended settings first, then "Choose individually" to switch features one by one |
| `oa-publish` | "Your website is ready." with "Create your first campaign" as the next step |
| `og-assistant`, `og-form` | One setup indicator (Your cause, Goal and dates, Ways to contribute, Review) shared by the assistant and the form |
| `og-submit`, `og-approve` | Approval does not publish; the campaign stays a draft until "Publish approved campaign" |
| `op-game`, `sp-direct`, `sp-game` | A labelled choice between "Give an amount" and "Play Memory Match" |
| `sp-game`, `sp-game-confirm` | Rules up front, nonblocking per-pair feedback, "New board" keeps the suggestion, review from the bar, final amount chosen by the supporter |
| `oa-sponsor`, `sp-sponsor`, `oa-sponsor-confirm` | One fictional Memory Match sponsor budget, a pending reward that is not added to the personal checkout, and one confirmation that counts the reward once |
| `sp-vouchers` | Voucher card, full-screen "Show voucher" view with "Present this to store staff", merchant, branch, status, expiry, restrictions, QR and backup code, then My activity |
| `sp-lowdata` | Low-data mode turns on and off |
| `fn-public` | "Funding goal reached" panel with delivery reported separately; a milestone's linked expense opens the filtered expense list |

## Video freshness

- Last verified application commit: `db4c8a4`. Assembly finished 22 Oct 2026, 10:33am IST. The walkthrough scripts and narration in this working tree were updated with that recording and are not a separate commit.
- Detailed walkthrough: **current**. `output/together-demo.mp4` probes at 1985.867 seconds (33:05). 1920×1080 H.264, AAC, English `mov_text`. Every scene check in the isolated recording passed, including the fictional Memory Match sponsor budget, the pending reward, and the one confirmation. `output/assembly-report.json` lists no console errors and no sped-up scenes.
- Previous presales cut: **preserved**. `output/together-presales.mp4` probes at 169.533 seconds (2:49). It remains available for comparison but is superseded for first-time customers because sponsor material occupies more than half of it.
- First-time presales cut: **generated; audible review pending**. `output/together-presales-first-time.mp4` probes at exactly 270.000 seconds (04:30), 1920×1080 at 30 fps, with English AAC narration, burned captions, English `mov_text`, and chapters. It opens on the public branded website, then covers organization setup, campaign launch, sharing, supporter contribution, sponsor play, partner reward, referral, transparency, and the CTA. Full visual review and technical audio/caption checks completed 22 Oct 2026, 11:53 AM IST. The available reviewer cannot hear audio, so a person must still check pronunciation, cadence, and joins before this export is marked Complete; see `PRESALES-FIRST-TIME.md` and the output verification report.
- Subtitles: `together-demo.en.srt`, `together-demo.en.vtt`, `together-presales.en.srt`, `together-presales.en.vtt`, plus the chapter files. `narration/scene-timings.md` matches this assembly. The homepage line names Home, Campaigns, About, and My activity.
- Spot check: frames at the sponsor save, the pending Memory Match reward, the ₹50 confirmation, the funded public page, and the closing card match those subtitle windows. Every presales cue, and sampled cues in `oa-sponsor`, `sp-sponsor`, `oa-sponsor-confirm`, and `fn-public`, had speech inside the cue (peak about −2 dB).
- Voice-over is local Piper only. Nothing was uploaded or published.

Update this section whenever a user-facing change touches the walkthrough. If a scene or the final video could not be re-recorded, list the scene ids here and set the final video to stale, with the blocker.
