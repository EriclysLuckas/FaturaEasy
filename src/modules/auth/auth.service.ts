// src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs'

import { prisma } from '../../infra/database/prisma.js'

import { InvoiceCloseService }
  from '../invoices/invoice-close.service.js'

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
  private invoiceCloseService =
    new InvoiceCloseService()

  async register(data: RegisterInput) {
    const userExists =
      await prisma.user.findUnique({
        where: {
          email: data.email,
        },
      })

    if (userExists) {
      throw new Error(
        'User already exists'
      )
    }

    const hashedPassword =
      await bcrypt.hash(
        data.password,
        10
      )

    const user =
      await prisma.user.create({
        data: {
          name: data.name,

          email: data.email,

          password:
            hashedPassword,
        },
      })

    return user
  }

  async login(data: LoginInput) {
    const user =
      await prisma.user.findUnique({
        where: {
          email: data.email,
        },
      })

    if (!user) {
      throw new Error(
        'Invalid credentials'
      )
    }

    const passwordMatch =
      await bcrypt.compare(
        data.password,
        user.password
      )

    if (!passwordMatch) {
      throw new Error(
        'Invalid credentials'
      )
    }

    //
    // 🔥 sincroniza fechamento automático
    //

    await this.invoiceCloseService
      .autoCloseInvoices()

    return user
  }
}