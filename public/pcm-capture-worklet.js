class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Float32Array(2048);
    this.offset = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (input) {
      let sourceOffset = 0;
      while (sourceOffset < input.length) {
        const count = Math.min(this.chunk.length - this.offset, input.length - sourceOffset);
        this.chunk.set(input.subarray(sourceOffset, sourceOffset + count), this.offset);
        this.offset += count;
        sourceOffset += count;
        if (this.offset === this.chunk.length) {
          const completed = this.chunk;
          this.chunk = new Float32Array(2048);
          this.offset = 0;
          this.port.postMessage(completed.buffer, [completed.buffer]);
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
