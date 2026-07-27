import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  hashPassword,
  verifyPassword,
} from "../../shared/security/passwordHasher.js";
import type { UserRepository } from "../users/user.repository.js";
import { userRoles } from "../users/user.types.js";
import { toAuthUser } from "./auth.mapper.js";
import type {
  AuthResult,
  AuthenticatedPrincipal,
  LoginInput,
  RegisterInput,
  TokenPayload,
} from "./auth.types.js";

export class AuthService {
  public constructor(private readonly userRepository: UserRepository) {}

  public async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      throw AppError.conflict("A user with this email already exists.", {
        email: input.email,
      });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "member",
      status: "active",
    });
    const authUser = toAuthUser(user);

    return {
      user: authUser,
      token: this.signToken(authUser),
    };
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmailWithPassword(input.email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    if (user.status === "disabled") {
      throw AppError.forbidden("This account has been disabled.");
    }

    const authUser = toAuthUser(user);

    return {
      user: authUser,
      token: this.signToken(authUser),
    };
  }

  public async getCurrentUser(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user || user.status === "disabled") {
      throw AppError.unauthorized("The authenticated account is unavailable.");
    }

    return toAuthUser(user);
  }

  public async validateSession(token: string): Promise<AuthenticatedPrincipal> {
    const payload = this.verifyToken(token);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status === "disabled") {
      throw AppError.unauthorized("The authenticated account is unavailable.");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private signToken(user: AuthenticatedPrincipal) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  private verifyToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);

      if (
        typeof payload === "object" &&
        typeof payload.sub === "string" &&
        typeof payload.email === "string" &&
        typeof payload.role === "string" &&
        userRoles.includes(payload.role as (typeof userRoles)[number])
      ) {
        return {
          sub: payload.sub,
          email: payload.email,
          role: payload.role as TokenPayload["role"],
        };
      }
    } catch {
      throw AppError.unauthorized("Invalid or expired authentication token.");
    }

    throw AppError.unauthorized("Invalid authentication token.");
  }
}
