/* Prepare the same deterministic chamber PCM off the UI thread. */
importScripts("scene_score.js");
self.onmessage = ({ data }) => {
  try {
    const score = EarthSceneScore.makeScore(data.scan, data.options);
    const pcm = EarthSceneScore.synthesizePCM(score, data.sampleRate);
    self.postMessage({ pcm, sampleRate: data.sampleRate }, pcm.map(channel => channel.buffer));
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
