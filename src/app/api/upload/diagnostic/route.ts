import { NextRequest, NextResponse } from 'next/server';
import { storjClient } from '@/lib/storj';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    // Check if Storj credentials are configured
    const hasAccessKey = !!process.env.STORJ_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.STORJ_SECRET_ACCESS_KEY;
    const endpoint = process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io';
    const bucketName = process.env.STORJ_BUCKET_NAME || 'kms-election-files';
    const region = process.env.STORJ_REGION || 'us-east-1';

    const config = {
      hasAccessKey,
      hasSecretKey,
      endpoint,
      bucketName,
      region,
      credentialsConfigured: hasAccessKey && hasSecretKey
    };

    if (!hasAccessKey || !hasSecretKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Storj credentials not configured',
        config
      });
    }

    // Test Storj connection
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1
      });

      if (!storjClient) {
        throw new Error('Storj client is not initialized');
      }

      await storjClient.send(command);

      return NextResponse.json({
        status: 'success',
        message: 'Storj connection successful',
        config
      });
    } catch (storjError) {
      console.error('Storj connection test failed:', storjError);
      return NextResponse.json({
        status: 'error',
        message: `Storj connection failed: ${storjError instanceof Error ? storjError.message : 'Unknown error'}`,
        config,
        error: storjError instanceof Error ? storjError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Diagnostic failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
