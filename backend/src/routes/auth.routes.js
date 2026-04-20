import { Router } from "express";
import { z } from "zod";
import { comparePassword, signToken } from "../utils/auth.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(3)
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login payload.",
      errors: parsed.error.flatten()
    });
  }

  const identifier = parsed.data.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { rollNumber: identifier },
        { username: identifier }
      ]
    },
    include: {
      studentProfile: true
    }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const isValidPassword = await comparePassword(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      rollNumber: user.rollNumber,
      username: user.username,
      pointsBalance: user.pointsBalance,
      studentProfile: user.studentProfile
    }
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { studentProfile: true }
  });

  return res.json({
    user: {
      id: user.id,
      role: user.role,
      rollNumber: user.rollNumber,
      username: user.username,
      pointsBalance: user.pointsBalance,
      studentProfile: user.studentProfile
    }
  });
});

export default router;
