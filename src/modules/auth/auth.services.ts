import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UserService } from "../users/user.services.js";

export class AuthService {
  private userService = new UserService();

  async register(name: string, email: string, password: string) {
    const passwordHash = await hash(password, 8);

    const user = await this.userService.create({
      name,
      email,
      password: passwordHash,
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { sub: user.id },
      env.jwtSecret,
      { expiresIn: "7d" }
    );

    return { token };
  }
}
