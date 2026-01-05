/**
 * Test Pexels API integration
 */
import 'dotenv/config';
import { searchPexels } from '../../src/visuals/providers/pexels';

async function main() {
  console.log('🎬 Testing Pexels API...\n');

  try {
    // Test search with portrait orientation (for TikTok)
    const query = 'technology office';
    console.log(`Searching for: "${query}" (portrait orientation)\n`);

    const videos = await searchPexels({
      query,
      orientation: 'portrait',
      perPage: 5,
    });

    console.log(`Found ${videos.length} videos:\n`);

    for (const video of videos) {
      console.log(`  📹 ID: ${video.id}`);
      console.log(`     Duration: ${video.duration}s`);
      console.log(`     Size: ${video.width}x${video.height}`);
      console.log(`     User: ${video.user}`);
      console.log(`     URL: ${video.url.substring(0, 80)}...`);
      console.log('');
    }

    console.log('✅ Pexels API working correctly!');
  } catch (error) {
    console.error('❌ Pexels test failed:', error);
    process.exit(1);
  }
}

main();
