/**
 * DEPRECATED: This API endpoint has been replaced with direct n8n webhook integration.
 * 
 * The frontend now sends bulk import requests directly to:
 * https://n8n-n8n.swl3bc.easypanel.host/webhook/contacts-upload
 * 
 * This offloads the processing to an external service to avoid timeouts
 * and resource constraints in the serverless environment.
 * 
 * IMPORTANT: This file is kept as a stub that returns a deprecation notice.
 * The original implementation has been preserved in documentation/bulk_import_implementation_reference.ts
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'This API endpoint is deprecated. Bulk contact imports should be sent directly to the n8n webhook.',
    redirectTo: 'https://n8n-n8n.swl3bc.easypanel.host/webhook/contacts-upload',
  }, { status: 410 }); // 410 Gone status code
}
