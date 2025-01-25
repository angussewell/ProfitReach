import { NextResponse } from 'next/server';
import { getGoHighLevelClient } from '@/lib/gohighlevel';

export async function GET() {
  try {
    const client = getGoHighLevelClient();
    
    // Create a test contact
    const contact = await client.createContact({
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
    });

    // Add some custom values
    await client.updateCustomValues(contact.id, [
      {
        name: 'test_field',
        value: 'test_value',
      },
    ]);

    // Create a task for the contact
    const task = await client.createTask({
      title: 'Test Task',
      description: 'This is a test task',
      contactId: contact.id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({
      success: true,
      contact,
      task,
    });
  } catch (error) {
    console.error('GoHighLevel test error:', error);
    return NextResponse.json(
      { error: 'Failed to test GoHighLevel integration' },
      { status: 500 }
    );
  }
} 