# Heart-rate voice call (experimental)

## What it does

When the SMS model sets `medical_escalation` to `"heart_rate_call"` and `HEART_RATE_VOICE_ENABLED=1`, the server places an **outbound Twilio call**:

1. **Play** an English ElevenLabs TTS intro (emergency-first; [heart-rate-voice-script.md](heart-rate-voice-script.md)).
2. **Record** up to **30 seconds** of audio (`<Record>`).
3. **Download** the recording (expects **WAV** container — configure Twilio/account so recordings are WAV for MVP).
4. Run **band-pass + envelope + autocorrelation** BPM estimation ([lib/heartRateBpm.js](lib/heartRateBpm.js)) — not raw FFT peak hunting.
5. **Play** a second TTS clip with a **non-diagnostic** readout.

## Configuration

| Variable | Purpose |
|----------|---------|
| `HEART_RATE_VOICE_ENABLED=1` | Turn feature on |
| `PUBLIC_APP_URL` | Base URL for Twilio webhooks |
| `TWILIO_*` | Same as other voice features |
| `ELEVENLABS_API_KEY` | TTS |
| `ELEVENLABS_VOICE_ID` or `HEART_RATE_VOICE_ID` | Voice |
| `HEART_RATE_VOICE_SCRIPT_MD` | Optional path to custom intro markdown |

## Limitations (expected failure modes)

- **Phone-as-mic on the chest** over **PSTN** is extremely noisy; many estimates will be **`null`** (weak periodicity).
- **MP3-only** recordings from Twilio are **not** decoded in MVP — set recordings to **WAV** or extend the decoder.
- **Not medical grade**; do not use output for diagnosis or to rule out emergencies.
- Intro is **English**; localize later if needed.

## Manual test

1. Set env vars; restart `node server.js`.
2. Send an SMS that describes **chest discomfort** so the model returns `"heart_rate_call"`.
3. Answer the call; hold the phone as instructed; stay quiet for the recording window.
4. Check server logs for `[heart-rate-voice] after-record` and `bpm` / `detail`.

## DSP reference

Background: [fourier_transform.md](fourier_transform.md) (pedagogical). Production code uses **autocorrelation on a band-passed envelope**, not a single global FFT peak.
