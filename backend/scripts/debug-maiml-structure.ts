/**
 * MAIMLファイルのXML構造確認スクリプト
 */
import { S3Client, GetObjectCommand, GetObjectCommandOutput, S3ClientConfig } from '@aws-sdk/client-s3';
import { parseStringPromise } from 'xml2js';

const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT || 'http://10.1.1.219:3002',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || 'test:tester',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'testing',
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  bucket: process.env.S3_BUCKET_NAME || 'mmdpf-files',
};

const FILE_KEY = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/QuantumDotLED/QuantumDotLED.maiml';

async function main() {
  const s3ClientConfig: S3ClientConfig = {
    endpoint: S3_CONFIG.endpoint,
    region: S3_CONFIG.region,
    forcePathStyle: S3_CONFIG.forcePathStyle,
  };
  (s3ClientConfig as any).credentials = {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  };
  const s3 = new S3Client(s3ClientConfig);

  const response = (await s3.send(new GetObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: FILE_KEY,
  }))) as GetObjectCommandOutput;

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const xml = Buffer.concat(chunks).toString('utf-8');

  console.log('=== RAW XML (first 2000 chars) ===');
  console.log(xml.substring(0, 2000));
  console.log('\n=== PARSED (ignoreAttrs:false, mergeAttrs:true) ===');

  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    ignoreAttrs: false,
  });
  console.log(JSON.stringify(parsed, null, 2).substring(0, 3000));

  console.log('\n=== PARSED (ignoreAttrs:false, mergeAttrs:false) ===');
  const parsed2 = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: false,
    ignoreAttrs: false,
  });
  console.log(JSON.stringify(parsed2, null, 2).substring(0, 3000));
}

main().catch(console.error);
