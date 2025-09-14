#!/usr/bin/env tsx

import 'dotenv/config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

import { ImageService } from '../lib/scene/image-service';

console.log('🔧 R2 Connection Test');
console.log('===================');

async function testImageService() {
    console.log('\n🧪 Testing ImageService with R2 integration...');

    try {
        // Initialize the ImageService (this will validate R2 configuration)
        const imageService = new ImageService();
        console.log('✅ ImageService initialized successfully');

        // Test image upload with a small test image
        const testImageBuffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'base64'
        );

        console.log('📤 Testing image upload to R2...');
        const result = await (imageService as any).uploadImageBuffer(
            testImageBuffer,
            'image/png',
            'test'
        );

        console.log(`✅ Upload successful! Image URL: ${result.url}`);

        // Validate the URL format
        if (imageService.isValidImage(result.url)) {
            console.log('✅ Generated URL is valid');
        } else {
            console.log('⚠️  Generated URL validation failed');
        }

        return true;

    } catch (error) {
        console.error('❌ ImageService test failed:', error);

        if (error instanceof Error) {
            if (error.message.includes('Missing required R2 environment variables')) {
                console.error('\n📋 Please ensure these environment variables are set:');
                console.error('   - CLOUDFLARE_ACCOUNT_ID');
                console.error('   - CLOUDFLARE_R2_ACCESS_KEY_ID');
                console.error('   - CLOUDFLARE_R2_SECRET_ACCESS_KEY');
                console.error('   - CLOUDFLARE_R2_BUCKET_NAME');
            }
        }

        return false;
    }
}

async function main() {
    console.log('\n🚀 Starting ImageService R2 integration test...\n');

    const success = await testImageService();

    if (success) {
        console.log('\n🎉 ImageService R2 integration working perfectly!');
        console.log('✅ Your application is ready to generate and store images in R2');
    } else {
        console.log('\n💥 ImageService R2 integration test failed.');
        console.log('\n🔍 Troubleshooting checklist:');
        console.log('1. Verify all R2 environment variables are set correctly');
        console.log('2. Check that your R2 API tokens have the correct permissions');
        console.log('3. Ensure the R2 bucket exists and is accessible');
        console.log('4. Try from a different network (check firewall/proxy)');

        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
