import Mux from '@mux/mux-node';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  auth: {
    mux_token_id: 'YOUR_MUX_TOKEN_ID',
    mux_token_secret: 'YOUR_MUX_TOKEN_SECRET'
  }
};

const mux = new Mux({
  tokenId: config.auth.mux_token_id,
  tokenSecret: config.auth.mux_token_secret
});

const assetId = 'bJYo102GZfAshaHPR300GFA01DsmSdfjsbW9Gw7PcCEv5s';

try {
  console.log('🔍 Retrieving asset data from Mux...');
  const asset = await mux.video.assets.retrieve(assetId);
  
  console.log('✅ SUCCESS! Asset data retrieved:');
  console.log('Asset ID:', asset.id);
  console.log('Status:', asset.status);
  console.log('Duration:', asset.duration);
  console.log('Resolution Tier:', asset.resolution_tier);
  console.log('Video Quality:', asset.video_quality);
  console.log('Aspect Ratio:', asset.aspect_ratio);
  console.log('Created:', asset.created_at);
  
  if (asset.playback_ids && asset.playback_ids.length > 0) {
    console.log('Playback ID:', asset.playback_ids[0].id);
    console.log('Playback Policy:', asset.playback_ids[0].policy);
  }
  
  if (asset.tracks && asset.tracks.length > 0) {
    console.log('Tracks:', asset.tracks.length);
    asset.tracks.forEach((track, i) => {
      console.log(`  Track ${i+1}: ${track.type} - ${track.duration}s`);
    });
  }
  
  console.log('\n📊 Full asset object:');
  console.log(JSON.stringify(asset, null, 2));
  
} catch (error) {
  console.log('❌ ERROR retrieving asset:');
  console.log('Message:', error.message);
  console.log('Status:', error.status);
  console.log('Details:', error.response?.data || error.details);
}