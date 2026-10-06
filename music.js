(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let master = null;
  let compressor = null;
  let timer = null;
  let nextStepAt = 0;
  let stepIndex = 0;
  let scoreSource = () => 0;
  let enabled = true;
  let playing = false;

  const chords = [48, 43, 45, 41]; // C、G、Am、F
  const melody = [0, -1, 2, -1, 4, 2, 1, -1, 0, -1, 2, 4, 4, -1, 3, -1];
  const scale = [0, 2, 4, 7, 9];

  function makeContext() {
    if (context || !AudioContextClass) return !!context;
    try {
      context = new AudioContextClass({ latencyHint: "interactive" });
      master = context.createGain();
      master.gain.value = 0;
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 18;
      compressor.ratio.value = 2.5;
      compressor.attack.value = 0.012;
      compressor.release.value = 0.22;
      master.connect(compressor);
      compressor.connect(context.destination);
      return true;
    } catch {
      context = null;
      master = null;
      return false;
    }
  }

  function midiFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function pluck(note, at, length, volume, wave = "sine") {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(midiFrequency(note), at);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(volume, at + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  }

  function kick(at, volume) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(145, at);
    oscillator.frequency.exponentialRampToValueAtTime(54, at + 0.14);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(volume, at + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(at);
    oscillator.stop(at + 0.21);
  }

  function softPad(root, at, barDuration, volume) {
    [root + 12, root + 16, root + 19].forEach((note, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(midiFrequency(note), at);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.linearRampToValueAtTime(volume, at + 0.18);
      envelope.gain.setValueAtTime(volume, at + Math.max(0.2, barDuration - 0.24));
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + barDuration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(at);
      oscillator.stop(at + barDuration + 0.02);
    });
  }

  function scheduleStep(index, at, score) {
    const eighth = index % 8;
    const bar = Math.floor(index / 8) % chords.length;
    const stage = score >= 1600 ? 3 : score >= 1000 ? 2 : score >= 600 ? 1 : 0;
    const bpm = 92 + Math.min(1, score / 2000) * 26;
    const stepDuration = 30 / bpm;
    const barDuration = stepDuration * 8;
    const root = chords[bar];

    if (eighth === 0) softPad(root, at, barDuration, 0.014 + stage * 0.001);

    const beat = eighth % 2 === 0;
    if (beat && (eighth === 0 || eighth === 4 || (stage >= 3 && eighth === 6))) {
      kick(at, 0.075 + stage * 0.007);
      pluck(root, at, 0.3, 0.035 + stage * 0.004, "sine");
    }

    const degree = melody[index % melody.length];
    if (degree >= 0) {
      pluck(72 + scale[degree], at, 0.2, 0.105 + stage * 0.008, "triangle");
      if (stage >= 2 && eighth === 6) pluck(79 + scale[(degree + 2) % scale.length], at + 0.025, 0.13, 0.036, "sine");
    } else if (stage >= 1 && eighth % 2 === 1 && eighth !== 7) {
      pluck(84 + scale[(index + bar) % scale.length], at, 0.12, 0.028 + stage * 0.004, "sine");
    }

    if (beat && (eighth === 2 || eighth === 6)) {
      pluck(91, at, 0.055, 0.016 + stage * 0.002, "sine");
    }
    return stepDuration;
  }

  function scheduleAhead() {
    if (!playing || !context || context.state !== "running") return;
    const horizon = context.currentTime + 0.14;
    while (nextStepAt < horizon) {
      const score = Math.max(0, Number(scoreSource()) || 0);
      nextStepAt += scheduleStep(stepIndex, nextStepAt, score);
      stepIndex += 1;
    }
  }

  function start(getScore = () => 0) {
    scoreSource = typeof getScore === "function" ? getScore : () => 0;
    if (!enabled || !makeContext()) return;
    const begin = () => {
      if (!enabled || playing) return;
      playing = true;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0.14, context.currentTime, 0.12);
      nextStepAt = context.currentTime + 0.06;
      stepIndex = 0;
      scheduleAhead();
      timer = window.setInterval(scheduleAhead, 25);
    };
    if (context.state === "suspended") context.resume().then(begin).catch(() => {});
    else begin();
  }

  function unlock() {
    if (makeContext() && context.state === "suspended") context.resume().catch(() => {});
  }

  function stop() {
    playing = false;
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    if (!context || !master || context.state !== "running") return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0, context.currentTime, 0.06);
    window.setTimeout(() => {
      if (!playing && context?.state === "running") context.suspend().catch(() => {});
    }, 350);
  }

  function setEnabled(next) {
    enabled = !!next;
    if (!enabled) stop();
    return enabled;
  }

  window.ecoMusic = { start, stop, unlock, setEnabled, get enabled() { return enabled; } };
})();
