import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export async function hashOtp(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(otp, salt)
}

export async function compareOtp(candidate: string, hash: string): Promise<boolean> {
  return bcrypt.compare(candidate, hash)
}
