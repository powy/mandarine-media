import { S3Client, PutObjectCommand, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import fs from 'fs-extra';

async function testS3Permissions() {
  console.log('🔍 Testing S3 Permissions\n');
  
  // Read config
  const configPath = './subtitle-config-test.json';
  const config = await fs.readJson(configPath);
  
  console.log('📋 Configuration:');
  console.log(`  Bucket: ${config.s3.bucket_name}`);
  console.log(`  Region: ${config.s3.region}`);
  console.log(`  Folder: ${config.s3.subtitle_folder}\n`);
  
  // Initialize clients
  const s3Client = new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.access_key_id,
      secretAccessKey: config.s3.secret_access_key
    }
  });
  
  const stsClient = new STSClient({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.access_key_id,
      secretAccessKey: config.s3.secret_access_key
    }
  });
  
  try {
    // 1. Check AWS Identity
    console.log('1️⃣ Checking AWS Identity...');
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    console.log('✅ AWS Identity:');
    console.log(`  Account: ${identity.Account}`);
    console.log(`  User ARN: ${identity.Arn}`);
    console.log(`  User ID: ${identity.UserId}\n`);
    
    // 2. List buckets (to verify basic S3 access)
    console.log('2️⃣ Testing S3 Access...');
    try {
      const listCommand = new ListBucketsCommand({});
      const buckets = await s3Client.send(listCommand);
      console.log(`✅ Can list buckets (found ${buckets.Buckets.length} buckets)\n`);
    } catch (error) {
      console.log(`⚠️ Cannot list buckets: ${error.message}\n`);
    }
    
    // 3. Test upload to the specific path
    console.log('3️⃣ Testing Upload to Specific Path...');
    const testKey = `${config.s3.subtitle_folder}/test-permissions/test-file-${Date.now()}.txt`;
    console.log(`  Test key: ${testKey}`);
    
    const uploadCommand = new PutObjectCommand({
      Bucket: config.s3.bucket_name,
      Key: testKey,
      Body: Buffer.from('Test upload from subtitle tool permission test'),
      ContentType: 'text/plain'
    });
    
    try {
      await s3Client.send(uploadCommand);
      console.log('✅ Successfully uploaded test file!');
      console.log('  The S3 permissions are working correctly.\n');
    } catch (error) {
      console.log('❌ Failed to upload test file:');
      console.log(`  Error: ${error.message}`);
      console.log(`  Error Code: ${error.Code || error.name}`);
      
      if (error.message.includes('not authorized')) {
        console.log('\n📝 Troubleshooting:');
        console.log('  1. Verify the policy is attached to the user');
        console.log('  2. Check if there are any Deny policies');
        console.log('  3. Ensure the policy was saved/applied');
        console.log('  4. Try detaching and re-attaching the policy');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during testing:');
    console.error(error);
  }
}

// Run the test
testS3Permissions().catch(console.error);