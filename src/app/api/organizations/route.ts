import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Only admin users can create organizations
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, adminEmail, adminPassword } = await request.json();

    if (!name || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create organization and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
        },
      });

      const user = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          organizationId: organization.id,
        },
      });

      return { organization, user };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Error creating organization' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      where: session.user.role === 'admin' ? {} : { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        ghlConnected: true,
        createdAt: true,
      },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Error fetching organizations' },
      { status: 500 }
    );
  }
} 