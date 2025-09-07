import { BackendService } from './src/subtools/mux-upload/services/backendService.js';
import { createLogger } from './src/subtools/mux-upload/config/logger.js';

const config = {
  backend: {
    server_address: 'http://localhost:8000',
    user: 'your-username@example.com',
    password: 'your-password'
  }
};

const logger = createLogger(config);
const backendService = new BackendService(config, logger);

const uuid = '25b06352-9480-4c63-ac2a-ebe67d87e15a';

// Test the updateVideoFileWithMuxData method with real Mux data
const muxData = {
  assetId: 'bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s',
  status: 'ready',
  duration: 10.766667,
  playback_ids: [
    {
      id: 'yuuEVwsJ01mgF1ZwktHTVztfqGsItkfVOXh70266Fmcdo',
      policy: 'public'
    }
  ],
  aspect_ratio: '9:16',
  tracks: [
    {
      type: 'audio',
      max_channels: 2,
      duration: 10.687833
    },
    {
      type: 'video',
      max_width: 1080,
      max_height: 1920,
      max_frame_rate: 30.004,
      duration: 10.765178
    },
    {
      type: 'text',
      text_type: 'subtitles',
      language_code: 'fr',
      name: 'Français'
    },
    {
      type: 'text', 
      text_type: 'subtitles',
      language_code: 'en',
      name: 'English'
    },
    {
      type: 'text',
      text_type: 'subtitles', 
      language_code: 'ko',
      name: '한국어'
    }
  ]
};

try {
  console.log('🔄 Testing backend update with Mux data...');
  const result = await backendService.updateVideoFileWithMuxData(uuid, muxData);
  console.log('✅ SUCCESS! Backend updated:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.log('❌ ERROR updating backend:');
  console.log('Message:', error.message);
  console.log('Details:', error.response?.data || error.details);
}