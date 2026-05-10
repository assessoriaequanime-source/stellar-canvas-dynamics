// public/pcm-processor-worklet.js
// ⚠️ This file MUST be at the root of public/ directory
// Used by Web Audio API to capture microphone as PCM 16-bit mono at 24kHz

class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) {
      return true;
    }

    // Convert float32 [-1, 1] to int16 [-32768, 32767]
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      // Clamp to [-1, 1]
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to int16
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Transfer ownership of the buffer to the main thread (zero-copy)
    this.port.postMessage(int16, [int16.buffer]);

    return true; // Continue processing
  }
}

registerProcessor("pcm-processor", PCMProcessor);
