// File: src/app/api/organizations/[organizationId]/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Assuming prisma client is initialized in this path
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: { organizationId: string; userId: string } }
) {
  const { organizationId, userId } = params;

  if (!organizationId || !userId) {
    return NextResponse.json({ error: 'Missing organizationId or userId parameter' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
  }

  const { name, email, role, password } = body;

  // --- Build the UPDATE query string and parameter array ---
  const setClauses: string[] = []; // Stores parts like '"columnName" = $N'
  const queryParams: any[] = []; // Stores parameter values in order
  let paramIndex = 1; // Counter for placeholders $1, $2, ...

  // Helper to add a clause and its corresponding parameter value
  const addUpdateParam = (value: any, columnName: string) => {
    queryParams.push(value);
    setClauses.push(`"${columnName}" = $${paramIndex}`);
    paramIndex++;
  };

  // Add fields to update if they are present in the body
  if (name !== undefined) {
    if (typeof name !== 'string') return NextResponse.json({ error: 'Invalid name format' }, { status: 400 });
    addUpdateParam(name, 'name');
  }
  if (email !== undefined) {
    if (typeof email !== 'string') return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }
    addUpdateParam(email, 'email');
  }
  if (role !== undefined) {
    if (typeof role !== 'string') return NextResponse.json({ error: 'Invalid role format' }, { status: 400 });
    addUpdateParam(role, 'role');
  }
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ error: 'Password cannot be empty' }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    addUpdateParam(hashedPassword, 'password');
  }

  // Always update the 'updatedAt' timestamp
  addUpdateParam(new Date(), 'updatedAt');

  // Check if any fields were actually provided for update
  if (setClauses.length <= 1) { // Only updatedAt was added
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
  }

  // --- Construct the final SQL string ---
  const setClauseString = setClauses.join(', ');

  // Add WHERE clause parameters (userId and organizationId)
  const userIdPlaceholder = `$${paramIndex}`;
  queryParams.push(userId);
  paramIndex++;
  const orgIdPlaceholder = `$${paramIndex}`;
  queryParams.push(organizationId);

  // Manually construct the full SQL query string
  const sqlString = `UPDATE "User" SET ${setClauseString} WHERE "id" = ${userIdPlaceholder} AND "organizationId" = ${orgIdPlaceholder}`;

  try {
    // --- Execute the query using $executeRawUnsafe ---
    // Pass the manually constructed string and spread the parameter array
    const result = await prisma.$executeRawUnsafe(sqlString, ...queryParams);

    if (result === 0) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId, organizationId: organizationId },
        select: { id: true }
      });
      if (!userExists) {
        return NextResponse.json({ error: 'User not found within the specified organization' }, { status: 404 });
      } else {
        console.warn(`User ${userId} in org ${organizationId} exists, but update query affected 0 rows. Data might be unchanged.`);
      }
    }

    // --- Fetch updated user data to return (excluding password) ---
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, image: true,
        emailVerified: true, createdAt: true, updatedAt: true, organizationId: true
      }
    });

    if (!updatedUser) {
      console.error(`Failed to retrieve updated data for user ${userId} after successful update.`);
      return NextResponse.json({ error: 'Could not retrieve updated user data after update' }, { status: 500 });
    }

    return NextResponse.json(updatedUser, { status: 200 });

  } catch (error: any) {
    console.error('Error during user update database operation:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta as any)?.target;
        return NextResponse.json({ error: `The provided ${target ? target.join(', ') : 'field'} is already in use.` }, { status: 409 });
      }
      if (error.code === 'P2025') {
         return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Internal Server Error occurred while updating user' }, { status: 500 });
  }
}

// Optional: Add GET, DELETE, etc. handlers if needed for this route
// export async function GET(request: Request, { params }: { params: { organizationId: string; userId: string } }) { ... }
// export async function DELETE(request: Request, { params }: { params: { organizationId: string; userId: string } }) { ... }
