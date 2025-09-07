import { BackendService } from './src/subtools/mux-upload/services/backendService.js';
import { createLogger } from './src/subtools/mux-upload/config/logger.js';
import Mux from '@mux/mux-node';

const config = {
  backend: {
    server_address: 'http://localhost:8000', 
    user: 'your-username@example.com',
    password: 'your-password'
  },
  auth: {
    mux_token_id: 'YOUR_MUX_TOKEN_ID',
    mux_token_secret: 'YOUR_MUX_TOKEN_SECRET'
  }
};

const logger = createLogger(config);
const backendService = new BackendService(config, logger);
const mux = new Mux({
  tokenId: config.auth.mux_token_id,
  tokenSecret: config.auth.mux_token_secret
});

const uuid = '25b06352-9480-4c63-ac2a-ebe67d87e15a';
const assetId = 'bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s';

console.log('🔄 Testing complete workflow: Mux retrieval + Backend update');

try {
  // Step 1: Retrieve data from Mux
  console.log('Step 1: Retrieving asset data from Mux...');
  const asset = await mux.video.assets.retrieve(assetId);
  
  // Step 2: Try the completion endpoint (will fail)
  console.log('Step 2: Testing completion endpoint...');
  const completionResult = await backendService.completeVideoFileFromMux(uuid);
  
  if (completionResult) {
    console.log('✅ Completion endpoint worked:', completionResult);
  } else {
    console.log('⚠️ Completion endpoint failed, using fallback...');
    
    // Step 3: Fallback - manual update with Mux data
    console.log('Step 3: Manual update with retrieved Mux data...');
    const updateResult = await backendService.updateVideoFileWithMuxData(uuid, {
      assetId: asset.id,
      status: asset.status,
      duration: asset.duration,
      playback_ids: asset.playback_ids
    });
    
    console.log('✅ Fallback update successful:', {
      uuid: updateResult.id,
      mux_asset_id: updateResult.mux_asset_id,
      duration: updateResult.duration_seconds,
      upload_status: updateResult.upload_status,
      encoding_status: updateResult.encoding_status
    });
  }
  
  // Step 4: Verify final state
  console.log('Step 4: Verifying final record state...');
  const finalCheck = await fetch(`http://localhost:8000/api/v1/video-files/${uuid}`, {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
    }
  });
  const finalData = await finalCheck.json();
  
  console.log('📊 Final record state:');
  console.log({
    id: finalData.id,
    mux_asset_id: finalData.mux_asset_id,
    mux_playback_id: finalData.mux_playback_id,
    duration_seconds: finalData.duration_seconds,
    upload_status: finalData.upload_status,
    encoding_status: finalData.encoding_status,
    resolution: `${finalData.max_resolution_width}x${finalData.max_resolution_height}`,
    aspect_ratio: finalData.aspect_ratio,
    file_size_bytes: finalData.file_size_bytes,
    frame_rate: finalData.frame_rate,
    audio_sample_rate: finalData.audio_sample_rate
  });
  
} catch (error) {
  console.log('❌ ERROR in workflow:');
  console.log('Message:', error.message);
}