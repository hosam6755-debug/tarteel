// Helper for downloading, decoding, concatenating audio, and exporting WAV format

/**
 * Fetch an audio file from URL and return ArrayBuffer
 */
export async function fetchAudioBuffer(url) {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`فشل تحميل الصوت: ${response.statusText}`);
  return await response.arrayBuffer();
}

/**
 * Concatenate multiple audio URLs or slice segmented chapter audio into a single AudioBuffer
 */
export async function concatenateVerseAudios(audioList, onProgress) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();

  if (!audioList || audioList.length === 0) {
    throw new Error('لم يتم العثور على ملفات صوتية للآيات المحددة.');
  }

  const isSegmented = audioList[0].isSegment;

  // 1. Handle Chapter Audio with Verse Timestamps (e.g. Al-Zain, Noreen, Yasser Al-Dossari)
  if (isSegmented) {
    const chapterUrl = audioList[0].chapterAudioUrl || audioList[0].audio_url;

    if (onProgress) {
      onProgress({
        step: 'audio_fetch',
        progress: 25,
        message: 'جاري تحميل ملف التلاوة العطرة من الخادم...',
      });
    }

    const arrayBuffer = await fetchAudioBuffer(chapterUrl);
    const decodedFullBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const startCut = Math.max(0, audioList[0].startTime);
    const lastItem = audioList[audioList.length - 1];
    const endCut = Math.min(
      decodedFullBuffer.duration,
      lastItem.endTime > 0 ? lastItem.endTime : decodedFullBuffer.duration
    );
    const totalDuration = Math.max(0.5, endCut - startCut);

    const sampleRate = decodedFullBuffer.sampleRate;
    const startSample = Math.floor(startCut * sampleRate);
    const endSample = Math.min(decodedFullBuffer.length, Math.ceil(endCut * sampleRate));
    const sliceLength = Math.max(1, endSample - startSample);

    const numberOfChannels = decodedFullBuffer.numberOfChannels;
    const combinedBuffer = audioCtx.createBuffer(numberOfChannels, sliceLength, sampleRate);

    for (let ch = 0; ch < numberOfChannels; ch++) {
      const srcChannel = decodedFullBuffer.getChannelData(ch);
      const destChannel = combinedBuffer.getChannelData(ch);
      for (let s = 0; s < sliceLength; s++) {
        destChannel[s] = srcChannel[startSample + s];
      }
    }

    // Relative verse timings starting from 0
    const verseTimings = audioList.map((item, idx) => {
      const relStart = Math.max(0, item.startTime - startCut);
      const itemEnd = item.endTime > 0 ? item.endTime : item.startTime + (item.duration || 3);
      const relEnd = Math.min(totalDuration, itemEnd - startCut);
      return {
        verse_number: item.verse_number,
        verse_key: item.verse_key,
        startTime: relStart,
        endTime: relEnd,
        duration: Math.max(0.5, relEnd - relStart),
        bufferIndex: idx,
      };
    });

    return {
      combinedBuffer,
      totalDuration,
      verseTimings,
      audioCtx,
    };
  }

  // 2. Handle Individual By-Ayah Audio Files (e.g. Mishari, AbdulBaset, Minshawi)
  const decodedBuffers = [];
  const verseTimings = [];
  let cumulativeTime = 0;

  for (let i = 0; i < audioList.length; i++) {
    const item = audioList[i];
    if (onProgress) {
      onProgress({
        step: 'audio_fetch',
        progress: Math.round(((i + 1) / audioList.length) * 45),
        message: `جاري تحميل ومعالجة صوت الآية ${item.verse_number}...`,
      });
    }

    try {
      const arrayBuffer = await fetchAudioBuffer(item.audio_url);
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      decodedBuffers.push(audioBuffer);

      const duration = audioBuffer.duration;
      verseTimings.push({
        verse_number: item.verse_number,
        verse_key: item.verse_key,
        startTime: cumulativeTime,
        endTime: cumulativeTime + duration,
        duration,
        bufferIndex: i,
      });

      cumulativeTime += duration;
    } catch (err) {
      console.error(`Error processing audio for verse ${item.verse_number}:`, err);
    }
  }

  if (decodedBuffers.length === 0) {
    throw new Error('تعذر فك تشفير التلاوة للآيات المحددة.');
  }

  const numberOfChannels = 2; // Stereo
  const sampleRate = decodedBuffers[0].sampleRate;
  const totalLength = Math.ceil(cumulativeTime * sampleRate);

  const combinedBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = combinedBuffer.getChannelData(channel);
    let offset = 0;

    for (const buf of decodedBuffers) {
      const srcData =
        buf.numberOfChannels > channel ? buf.getChannelData(channel) : buf.getChannelData(0);
      channelData.set(srcData, offset);
      offset += buf.length;
    }
  }

  return {
    combinedBuffer,
    totalDuration: cumulativeTime,
    verseTimings,
    audioCtx,
  };
}

/**
 * Encode an AudioBuffer into standard 16-bit PCM WAV Blob
 */
export function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // Write WAV Header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit precision

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}
