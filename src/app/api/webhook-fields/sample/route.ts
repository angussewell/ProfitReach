import { NextResponse } from 'next/server';

// Sample webhook fields that can be mapped
const SAMPLE_FIELDS = [
  // Contact fields
  'email',
  'first_name',
  'last_name',
  'company',
  'website',
  
  // Template fields
  '{email}',
  '{first_name}',
  '{last_name}',
  
  // Status fields
  'lead_status',
  'lifecycle_stage',
  
  // Scenario fields
  'make_sequence',
  'scenario_name'
];

export async function GET() {
  return NextResponse.json({ fields: SAMPLE_FIELDS });
} 