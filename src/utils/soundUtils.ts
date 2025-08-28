// Sound utility functions for task completion feedback

export type SoundType = 'bell' | 'chime' | 'yeah' | 'alarm' | 'pomodoro_alarm' | 'none';
export type WhiteNoiseType = 'clock' | 'none';

// Audio context for Web Audio API
let audioContext: AudioContext | null = null;
let isAudioContextInitialized = false;

// White noise state - using Web Audio API for reliable generation
let whiteNoiseSource: AudioBufferSourceNode | null = null;
let whiteNoiseGainNode: GainNode | null = null;
let isWhiteNoisePlaying = false;

// Initialize audio context
const initAudioContext = async () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext created successfully');
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      return null;
    }
  }
  
  // Resume AudioContext if it's suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      console.log('AudioContext resumed successfully');
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
      return null;
    }
  }
  
  isAudioContextInitialized = true;
  console.log('AudioContext state:', audioContext.state);
  return audioContext;
};

// Create high-quality white noise using Web Audio API
const createWhiteNoiseBuffer = async (type: WhiteNoiseType, volume: number = 0.3): Promise<AudioBuffer | null> => {
  if (type === 'none') return null;

  const ctx = await initAudioContext();
  if (!ctx) {
    console.warn('AudioContext not available for white noise');
    return null;
  }

  console.log(`Creating high-quality white noise: ${type}, volume: ${volume}`);

  // Create a longer buffer for better looping (30 seconds)
  const sampleRate = ctx.sampleRate;
  const bufferLength = sampleRate * 30; // 30 seconds for seamless loops
  const buffer = ctx.createBuffer(2, bufferLength, sampleRate); // Stereo

  // Generate different white noise patterns for each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    
    switch (type) {
      case 'clock':
        // Load actual clock sound file
        try {
          const audioResponse = await fetch('/sounds/clock.mp3');
          const arrayBuffer = await audioResponse.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          
          // Copy audio data from the loaded file
          const sourceChannels = Math.min(audioBuffer.numberOfChannels, buffer.numberOfChannels);
          for (let c = 0; c < sourceChannels; c++) {
            const sourceData = audioBuffer.getChannelData(c);
            const targetData = buffer.getChannelData(c);
            
            // Loop the audio to fill the entire buffer
            for (let i = 0; i < bufferLength; i++) {
              targetData[i] = sourceData[i % audioBuffer.length] * volume;
            }
          }
          
          // If source is mono but we need stereo, copy to both channels
          if (sourceChannels === 1 && buffer.numberOfChannels === 2) {
            const sourceData = audioBuffer.getChannelData(0);
            const rightChannelData = buffer.getChannelData(1);
            for (let i = 0; i < bufferLength; i++) {
              rightChannelData[i] = sourceData[i % audioBuffer.length] * volume;
            }
          }
        } catch (error) {
          console.warn('Failed to load clock.mp3, falling back to generated sound:', error);
          // Fallback to generated clock sound
          for (let i = 0; i < bufferLength; i++) {
            const time = i / sampleRate;
            const tickFreq = 1.2; // 1.2 Hz for natural clock rhythm
            const tickPhase = (time * tickFreq) % 1;
            
            // Sharp tick sound
            const tick = tickPhase < 0.05 ? Math.exp(-tickPhase * 100) * Math.sin(2 * Math.PI * 1000 * time) : 0;
            // Subtle mechanism noise
            const mechanism = (Math.random() - 0.5) * 0.02;
            
            channelData[i] = (tick * 0.8 + mechanism) * volume;
          }
        }
        break;
    }
  }

  console.log(`High-quality white noise buffer created: ${type}`);
  return buffer;
};

// Start white noise playback with Web Audio API
export const startWhiteNoise = async (type: WhiteNoiseType, volume: number = 0.3) => {
  if (type === 'none' || isWhiteNoisePlaying) {
    return;
  }

  const ctx = await initAudioContext();
  if (!ctx) {
    console.warn('AudioContext not available for white noise');
    return;
  }

  try {
    console.log(`Starting high-quality white noise: ${type}, volume: ${volume}`);
    
    // Stop any existing white noise
    if (whiteNoiseSource) {
      whiteNoiseSource.stop();
      whiteNoiseSource.disconnect();
    }
    
    // Create white noise buffer
    const buffer = await createWhiteNoiseBuffer(type, volume);
    if (!buffer) {
      console.error('Failed to create white noise buffer');
      return;
    }

    // Create gain node for volume control
    whiteNoiseGainNode = ctx.createGain();
    whiteNoiseGainNode.gain.setValueAtTime(volume, ctx.currentTime);
    whiteNoiseGainNode.connect(ctx.destination);

    // Create and start the source
    whiteNoiseSource = ctx.createBufferSource();
    whiteNoiseSource.buffer = buffer;
    whiteNoiseSource.loop = true;
    whiteNoiseSource.connect(whiteNoiseGainNode);
    whiteNoiseSource.start();

    isWhiteNoisePlaying = true;
    console.log('High-quality white noise started successfully');
    
  } catch (error) {
    console.error('Failed to start white noise:', error);
    isWhiteNoisePlaying = false;
  }
};

// Stop white noise playback
export const stopWhiteNoise = () => {
  console.log('Stopping white noise');
  
  isWhiteNoisePlaying = false;
  
  if (whiteNoiseSource) {
    try {
      whiteNoiseSource.stop();
      whiteNoiseSource.disconnect();
    } catch (error) {
      console.warn('Error stopping white noise source:', error);
    }
    whiteNoiseSource = null;
  }
  
  if (whiteNoiseGainNode) {
    try {
      whiteNoiseGainNode.disconnect();
    } catch (error) {
      console.warn('Error disconnecting white noise gain node:', error);
    }
    whiteNoiseGainNode = null;
  }
  
  console.log('White noise stopped successfully');
};

// Test white noise (plays for 5 seconds)
export const testWhiteNoise = async (type: WhiteNoiseType, volume: number = 0.3) => {
  if (type === 'none') {
    console.log('White noise type is "none", skipping test');
    return;
  }

  console.log(`Testing high-quality white noise: ${type}, volume: ${volume}`);
  
  // Stop any existing white noise
  stopWhiteNoise();
  
  // Start the test noise
  await startWhiteNoise(type, volume);
  
  // Stop after 5 seconds
  setTimeout(() => {
    stopWhiteNoise();
    console.log('White noise test completed');
  }, 5000);
};

// Check if white noise is currently playing
export const isWhiteNoiseActive = () => {
  return isWhiteNoisePlaying;
};

// Simple fallback using HTML5 Audio with generated data URLs
const playFallbackSound = (soundType: SoundType, volume: number = 0.5) => {
  console.log('Playing fallback sound:', soundType);
  
  const audio = new Audio();
  audio.volume = volume;
  switch (soundType) {
    case 'bell':
      audio.src = '/sounds/ding.mp3';
      break;
    case 'chime':
      audio.src = '/sounds/glockenspiel.mp3';
      break;
    case 'yeah':
      audio.src = '/sounds/yeah.mp3';
      break;
    default:
      return;
  }
  audio.play().catch(() => {});
};

// Generate different sound types using Web Audio API
const generateTone = async (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.5) => {
  const ctx = await initAudioContext();
  if (!ctx) {
    throw new Error('AudioContext not available');
  }
  
  console.log(`Generating tone: ${frequency}Hz, ${duration}s, ${type}, volume: ${volume}`);
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
  
  return new Promise<void>((resolve) => {
    oscillator.onended = () => {
      console.log('Tone ended');
      resolve();
    };
  });
};

export const playCompletionSound = async (soundType: SoundType, volume: number = 0.5) => {
  if (soundType === 'none') {
    console.log('Sound type is "none", skipping playback');
    return;
  }
  
  console.log(`Playing completion sound: ${soundType}, volume: ${volume}`);
  
  try {
    // Ensure AudioContext is initialized
    const ctx = await initAudioContext();
    if (!ctx) {
      console.warn('AudioContext not available, trying fallback...');
      playFallbackSound(soundType, volume);
      return;
    }
    
    switch (soundType) {
      case 'bell': {
        // Play first 2 seconds of /public/sounds/ding.mp3
        console.log('Playing bell sound from /sounds/ding.mp3 (2s)');
        try {
          const response = await fetch('/sounds/ding.mp3');
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(volume, ctx.currentTime);
          source.buffer = audioBuffer;
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(0, 0, Math.min(2, audioBuffer.duration));
          // Stop after 2s to ensure clip
          setTimeout(() => {
            try { source.stop(); } catch {}
          }, 2000);
        } catch (err) {
          console.warn('Falling back to generated bell tone due to error:', err);
          await generateTone(800, 0.3, 'sine', volume * 0.8);
          setTimeout(() => generateTone(600, 0.2, 'sine', volume * 0.6), 50);
        }
        break;
      }
        
      case 'chime': {
        // Glockenspiel aus Datei abspielen
        console.log('Playing chime sound from /sounds/glockenspiel.mp3');
        try {
          const response = await fetch('/sounds/glockenspiel.mp3');
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(volume, ctx.currentTime);
          source.buffer = audioBuffer;
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(0);
        } catch (err) {
          console.warn('Falling back to generated chime due to error:', err);
          generateTone(523, 0.15, 'sine', volume * 0.7); // C5
          setTimeout(() => generateTone(659, 0.15, 'sine', volume * 0.7), 100); // E5
          setTimeout(() => generateTone(784, 0.2, 'sine', volume * 0.8), 200); // G5
        }
        break;
      }
      case 'yeah': {
        // Play yeah.mp3
        console.log('Playing yeah sound from /sounds/yeah.mp3');
        try {
          const response = await fetch('/sounds/yeah.mp3');
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(volume, ctx.currentTime);
          source.buffer = audioBuffer;
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(0);
        } catch (err) {
          console.warn('Falling back to generated pop due to error:', err);
          await generateTone(150, 0.1, 'square', volume * 0.9);
          setTimeout(() => generateTone(100, 0.05, 'square', volume * 0.7), 50);
        }
        break;
      }
        
      case 'alarm':
        // Alarm sound - VERY penetrating warning tone (enhanced)
        console.log('Playing ENHANCED alarm sound');
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            // High-pitched alarming tone
            generateTone(1200, 0.3, 'sawtooth', volume * 0.6);
            setTimeout(() => generateTone(900, 0.25, 'triangle', volume * 0.5), 150);
            setTimeout(() => generateTone(1100, 0.2, 'square', volume * 0.4), 300);
          }, i * 400);
        }
        
        // Additional attention-grabbing sequence after main alarm
        setTimeout(() => {
          for (let j = 0; j < 3; j++) {
            setTimeout(() => {
              generateTone(1500, 0.15, 'triangle', volume * 0.7);
              setTimeout(() => generateTone(1300, 0.1, 'sawtooth', volume * 0.6), 80);
            }, j * 200);
          }
        }, 2500);
        break;
        
      case 'pomodoro_alarm':
        // Pomodoro alarm sound - VERY penetrating session end tone (distinct from task alarm)
        console.log('Playing ENHANCED Pomodoro alarm sound');
        // Main Pomodoro alarm sequence - uses different frequencies for distinction
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            // Lower, warmer but still penetrating tones for Pomodoro
            generateTone(800, 0.4, 'sine', volume * 0.7);
            setTimeout(() => generateTone(1000, 0.35, 'triangle', volume * 0.6), 200);
            setTimeout(() => generateTone(600, 0.3, 'square', volume * 0.5), 400);
          }, i * 500);
        }
        
        // Additional celebratory sequence for Pomodoro completion
        setTimeout(() => {
          // Three-tone celebratory pattern
          for (let j = 0; j < 4; j++) {
            setTimeout(() => {
              generateTone(659, 0.2, 'sine', volume * 0.8); // E5
              setTimeout(() => generateTone(784, 0.2, 'sine', volume * 0.8), 120); // G5
              setTimeout(() => generateTone(1047, 0.25, 'sine', volume * 0.9), 240); // C6
            }, j * 300);
          }
        }, 4200);
        
        // Final attention-grabbing crescendo
        setTimeout(() => {
          for (let k = 0; k < 3; k++) {
            setTimeout(() => {
              generateTone(1200, 0.2, 'triangle', volume * 0.9);
              setTimeout(() => generateTone(1400, 0.15, 'sawtooth', volume * 0.8), 100);
            }, k * 150);
          }
        }, 5500);
        break;
    }
    console.log('Sound playback completed');
  } catch (error) {
    console.warn('Could not play completion sound with Web Audio API:', error);
    // Try fallback
    playFallbackSound(soundType, volume);
  }
};

// Initialize audio context on first user interaction
export const initializeAudioOnUserInteraction = async () => {
  if (!isAudioContextInitialized) {
    console.log('Initializing audio on user interaction');
    await initAudioContext();
  }
};

// Debug function to test audio setup
export const debugAudioSetup = async () => {
  console.log('=== Audio Debug Info ===');
  console.log('AudioContext support:', !!(window.AudioContext || (window as any).webkitAudioContext));
  
  try {
    const ctx = await initAudioContext();
    if (ctx) {
      console.log('AudioContext state:', ctx.state);
      console.log('AudioContext sample rate:', ctx.sampleRate);
      console.log('AudioContext destination:', ctx.destination);
    } else {
      console.log('AudioContext could not be created');
    }
  } catch (error) {
    console.error('Error during audio debug:', error);
  }
  
  console.log('========================');
}; 