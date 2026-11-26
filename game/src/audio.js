// Sound, all synthesized: an engine hum that follows the throttle, a chime for
// a ring, a thud for a touchdown, a beep for a warning. Silent until the pilot
// first touches a control, and never a file.
export function makeAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 62;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ensure()) return;
    try {
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {
      // Silent on purpose: a missing beep never breaks the flight.
    }
  }

  return {
    unlock() {
      ensure();
    },
    engine(throttle, flying) {
      if (!ensure() || !engineGain) return;
      try {
        const target = flying ? 0.028 + throttle * 0.03 : 0;
        engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
        engineOsc.frequency.setTargetAtTime(58 + throttle * 46, ctx.currentTime, 0.1);
      } catch {
        // Silent on purpose.
      }
    },
    chime() {
      blip(880, 0.18, 'sine', 0.12);
      blip(1318, 0.28, 'sine', 0.1, 0.09);
    },
    thud() {
      blip(72, 0.3, 'sine', 0.22);
    },
    beep() {
      blip(1180, 0.09, 'square', 0.05);
    },
  };
}
