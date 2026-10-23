"""Synthesizes many sentences with one local Piper voice (offline; no network or API keys).

Reads a JSON list of {"text": ..., "out": ...} from stdin and writes one WAV per item.
"""
import json
import sys
import wave

from piper import PiperVoice, SynthesisConfig


def main() -> None:
    model, length_scale = sys.argv[1], float(sys.argv[2])
    voice = PiperVoice.load(model)
    config = SynthesisConfig(length_scale=length_scale)
    for job in json.load(sys.stdin):
        with wave.open(job["out"], "wb") as wav:
            voice.synthesize_wav(job["text"], wav, syn_config=config)
        print(job["out"], flush=True)


if __name__ == "__main__":
    main()
