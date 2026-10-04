import { prisma } from "../../db/prisma.js";
import { hashPassword, comparePassword } from "./password.js";
import { generateAccessToken } from "./jwt.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";


export async function getCurrentUser(userId: bigint) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id.toString(),
    email: user.email,
    createdAt: user.createdAt,
  };
}


export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
    },
  });

  const accessToken = generateAccessToken(user.id);

  return {
    user: {
      id: user.id.toString(),
      email: user.email,
    },
    accessToken,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const accessToken = generateAccessToken(user.id);

  return {
    user: {
      id: user.id.toString(),
      email: user.email,
    },
    accessToken,
  };
}