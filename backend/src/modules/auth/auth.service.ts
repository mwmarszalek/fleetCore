import bcrypt from 'bcryptjs'
import { prisma } from '../../db.js'

export async function findUserByEmail(email: string, cityId: string) {
  return prisma.user.findUnique({ where: { email_cityId: { email, cityId } } })
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}
