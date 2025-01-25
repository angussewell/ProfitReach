'use server'

import { prisma } from './prisma'

// Example server action for getting a user
export async function getUser(id: string) {
  return await prisma.account.findUnique({
    where: { id }
  })
}

// Example server action for creating a user
export async function createUser(data: any) {
  return await prisma.account.create({
    data
  })
}

// Example server action for updating a user
export async function updateUser(id: string, data: any) {
  return await prisma.account.update({
    where: { id },
    data
  })
} 