import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path if needed
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const orgId = params.organizationId;

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization: Only allow users from the same organization or admins to view users
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true }
    });

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin to see any org's users, otherwise restrict to the user's own org
    if (currentUser.role !== 'admin' && currentUser.organizationId !== orgId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users for the specified organization
    const users = await prisma.user.findMany({
      where: {
        organizationId: orgId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' } // Optional: order by creation date
    });

    return NextResponse.json(users);

  } catch (error) {
    console.error("!!! API Error: Failed to fetch users:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}


export async function POST(
  request: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const orgId = params.organizationId;

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization: Only allow admins or managers of the target organization to create users
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true }
    });

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user belongs to the organization and has the right role
    let canCreate = false;
    if (currentUser.role === 'admin') {
      canCreate = true; // Super admin can create in any org? Or should check org membership? Assuming admin can.
    } else if (currentUser.role === 'manager' && currentUser.organizationId === orgId) {
      canCreate = true; // Manager can create in their own org
    }

    if (!canCreate) {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // --- Input Validation ---
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['user', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role specified' }, { status: 400 });
    }

    // Prevent non-admins from creating admin users
    if (currentUser.role !== 'admin' && role === 'admin') {
       return NextResponse.json({ success: false, error: 'Only admins can create other admin users' }, { status: 403 });
    }
    
    // Prevent managers from creating managers? (Optional rule, depends on requirements)
    // if (currentUser.role === 'manager' && role === 'manager') {
    //    return NextResponse.json({ success: false, error: 'Managers cannot create other manager users' }, { status: 403 });
    // }


    // --- Database Operation ---
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUserId = crypto.randomUUID();
    const now = new Date();

    try {
      // Check if email exists *before* trying to insert
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true } // Only select id for efficiency
      });

      if (existingUser) {
        return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 }); // Use 400 or 409 Conflict
      }

      // Use $executeRaw for insertion
      await prisma.$executeRaw`
        INSERT INTO "User" (
          "id", "name", "email", "password", "role", "organizationId", "createdAt", "updatedAt"
        ) VALUES (
          ${newUserId}::text, ${name}, ${email}, ${hashedPassword}, ${role}, ${orgId}::text, ${now}, ${now}
        )
      `;

      // Fetch the newly created user to return it
      const newUser = await prisma.user.findUnique({
        where: { id: newUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          organizationId: true // Include orgId in response
        }
      });

      if (!newUser) {
        // This should ideally not happen if the insert succeeded
        console.error(`!!! API Error: Failed to fetch newly created user immediately after insert. ID: ${newUserId}`);
        return NextResponse.json({ success: false, error: 'Failed to retrieve created user post-insertion' }, { status: 500 });
      }

      return NextResponse.json(newUser, { status: 201 }); // 201 Created status

    } catch (dbError) {
      console.error("!!! API Error: Failed to create user (Database Operation):", dbError);

      // Check for unique constraint violation (email) - P2002
      // This might be redundant due to the pre-check, but good as a safeguard
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
         // Check if the violation is on the email field
         const target = dbError.meta?.target as string[] | undefined;
         if (target && target.includes('email')) {
           return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 }); // Use 400 or 409
         }
      }
      // Other DB errors
      return NextResponse.json({ success: false, error: 'Database operation failed' }, { status: 500 });
    }

  } catch (error) { // Outer catch for general errors (session, validation, JSON parsing etc.)
    console.error("!!! API Error: Failed to create user (General Handler):", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
