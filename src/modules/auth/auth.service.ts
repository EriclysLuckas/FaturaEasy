import bcrypt from 'bcryptjs'

import { prisma } from '../../infra/database/prisma.js'

interface RegisterInput {
  name: string
  email: string
  password: string
}

interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  async register(data: RegisterInput) {
    const userExists = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    })

    if (userExists) {
      throw new Error('User already exists')
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    })

    return user
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      user.password
    )

    if (!passwordMatch) {
      throw new Error('Invalid credentials')
    }

    return user
  }
}