import { prisma } from "../../infra/database/prisma.js";
import { hash } from "bcryptjs";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export class UserService {
  async create(data: CreateUserInput) {
    const userExists = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (userExists) {
      throw new Error("User already exists");
    }

    const passwordHash = await hash(data.password, 10);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }
}
