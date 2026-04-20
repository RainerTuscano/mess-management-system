import { MealType, PointTransactionType, RedemptionStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { addDays, mealDeadline, startOfDay, startOfWeek } from "../utils/date.js";

const router = Router();

router.use(requireAuth, requireRole(Role.ADMIN));

router.get("/dashboard", async (req, res) => {
  const today = startOfDay(new Date());
  const entries = await prisma.menuEntry.findMany({
    where: {
      mealDate: {
        gte: today,
        lt: addDays(today, 1)
      }
    },
    include: {
      mealOptOuts: true,
      attendances: true
    },
    orderBy: {
      mealType: "asc"
    }
  });

  const totalStudents = await prisma.user.count({
    where: {
      role: Role.STUDENT,
      isActive: true
    }
  });

  const headcount = entries.map((entry) => ({
    mealType: entry.mealType,
    mealDate: entry.mealDate,
    deadlineAt: mealDeadline(entry.mealDate, entry.mealType),
    optedOut: entry.mealOptOuts.length,
    attended: entry.attendances.filter((attendance) => attendance.wasPresent).length,
    eating: Math.max(totalStudents - entry.mealOptOuts.length, 0)
  }));

  const activeRedemptions = await prisma.redemption.count({
    where: {
      status: RedemptionStatus.ACTIVE
    }
  });

  return res.json({
    totalStudents,
    activeRedemptions,
    headcount
  });
});

router.get("/menus/week", async (req, res) => {
  const queryDate = req.query.date ? new Date(String(req.query.date)) : new Date();
  const weekStart = startOfWeek(queryDate);

  const week = await prisma.menuWeek.findUnique({
    where: { weekStart },
    include: {
      entries: {
        orderBy: [{ mealDate: "asc" }, { mealType: "asc" }]
      }
    }
  });

  return res.json({ week });
});

router.post("/menus/week", async (req, res) => {
  const entrySchema = z.object({
    mealDate: z.string().datetime(),
    mealType: z.nativeEnum(MealType),
    title: z.string().trim().min(3),
    description: z.string().trim().optional(),
    items: z.array(z.string().trim().min(1)).min(1)
  });

  const schema = z.object({
    weekStart: z.string().datetime(),
    entries: z.array(entrySchema).length(28)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid weekly menu payload.", errors: parsed.error.flatten() });
  }

  const weekStart = startOfWeek(parsed.data.weekStart);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.menuWeek.findUnique({
      where: { weekStart }
    });

    if (existing) {
      await tx.menuEntry.deleteMany({
        where: { menuWeekId: existing.id }
      });

      return tx.menuWeek.update({
        where: { id: existing.id },
        data: {
          createdById: req.user.id,
          entries: {
            create: parsed.data.entries.map((entry) => ({
              mealDate: startOfDay(entry.mealDate),
              mealType: entry.mealType,
              title: entry.title,
              description: entry.description,
              items: entry.items
            }))
          }
        },
        include: {
          entries: {
            orderBy: [{ mealDate: "asc" }, { mealType: "asc" }]
          }
        }
      });
    }

    return tx.menuWeek.create({
      data: {
        weekStart,
        createdById: req.user.id,
        entries: {
          create: parsed.data.entries.map((entry) => ({
            mealDate: startOfDay(entry.mealDate),
            mealType: entry.mealType,
            title: entry.title,
            description: entry.description,
            items: entry.items
          }))
        }
      },
      include: {
        entries: {
          orderBy: [{ mealDate: "asc" }, { mealType: "asc" }]
        }
      }
    });
  });

  return res.status(201).json({ week: result });
});

router.get("/extras", async (req, res) => {
  const extras = await prisma.extraItem.findMany({
    orderBy: [{ isActive: "desc" }, { pointsCost: "asc" }, { name: "asc" }]
  });

  return res.json({ extras });
});

router.post("/extras", async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2),
    description: z.string().trim().optional(),
    pointsCost: z.number().int().min(1),
    isActive: z.boolean().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid extra item payload.", errors: parsed.error.flatten() });
  }

  const extra = await prisma.extraItem.create({
    data: parsed.data
  });

  return res.status(201).json({ extra });
});

router.patch("/extras/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    pointsCost: z.number().int().min(1).optional(),
    isActive: z.boolean().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid extra item update.", errors: parsed.error.flatten() });
  }

  const extra = await prisma.extraItem.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  return res.json({ extra });
});

router.get("/headcount", async (req, res) => {
  const requestedDate = req.query.date ? new Date(String(req.query.date)) : new Date();
  const day = startOfDay(requestedDate);

  const totalStudents = await prisma.user.count({
    where: {
      role: Role.STUDENT,
      isActive: true
    }
  });

  const entries = await prisma.menuEntry.findMany({
    where: {
      mealDate: {
        gte: day,
        lt: addDays(day, 1)
      }
    },
    include: {
      mealOptOuts: true,
      attendances: true
    },
    orderBy: {
      mealType: "asc"
    }
  });

  const meals = entries.map((entry) => ({
    mealType: entry.mealType,
    deadlineAt: mealDeadline(entry.mealDate, entry.mealType),
    optedOut: entry.mealOptOuts.length,
    attended: entry.attendances.filter((attendance) => attendance.wasPresent).length,
    eating: Math.max(totalStudents - entry.mealOptOuts.length, 0)
  }));

  return res.json({ date: day, totalStudents, meals });
});

router.get("/analytics/attendance", async (req, res) => {
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -6);

  const entries = await prisma.menuEntry.findMany({
    where: {
      mealDate: {
        gte: rangeStart,
        lt: addDays(today, 1)
      }
    },
    include: {
      mealOptOuts: true,
      attendances: true,
      ratings: true
    },
    orderBy: [{ mealDate: "asc" }, { mealType: "asc" }]
  });

  const data = entries.map((entry) => ({
    date: entry.mealDate,
    mealType: entry.mealType,
    optedOut: entry.mealOptOuts.length,
    attended: entry.attendances.filter((attendance) => attendance.wasPresent).length,
    averageRating: entry.ratings.length
      ? Number((entry.ratings.reduce((sum, rating) => sum + rating.rating, 0) / entry.ratings.length).toFixed(2))
      : null
  }));

  return res.json({ data });
});

router.post("/attendance", async (req, res) => {
  const schema = z.object({
    menuEntryId: z.string().cuid(),
    studentIds: z.array(z.string().cuid()).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid attendance payload.", errors: parsed.error.flatten() });
  }

  const result = await prisma.$transaction(async (tx) => {
    const records = [];
    for (const studentId of parsed.data.studentIds) {
      const attendance = await tx.attendance.upsert({
        where: {
          userId_menuEntryId: {
            userId: studentId,
            menuEntryId: parsed.data.menuEntryId
          }
        },
        create: {
          userId: studentId,
          menuEntryId: parsed.data.menuEntryId,
          wasPresent: true
        },
        update: {
          wasPresent: true,
          markedAt: new Date()
        }
      });
      records.push(attendance);
    }
    return records;
  });

  return res.status(201).json({ recordsCreated: result.length });
});

router.post("/points/adjust", async (req, res) => {
  const schema = z.object({
    userId: z.string().cuid(),
    points: z.number().int().refine((value) => value !== 0, "Points cannot be zero."),
    description: z.string().trim().min(3)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid points adjustment payload.", errors: parsed.error.flatten() });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.data.userId },
      data: {
        pointsBalance: {
          increment: parsed.data.points
        }
      }
    });

    await tx.pointTransaction.create({
      data: {
        userId: parsed.data.userId,
        type: PointTransactionType.MANUAL_ADJUSTMENT,
        points: parsed.data.points,
        description: parsed.data.description
      }
    });
  });

  return res.status(201).json({ message: "Points updated successfully." });
});

router.get("/redemptions/active", async (req, res) => {
  const redemptions = await prisma.redemption.findMany({
    where: {
      status: RedemptionStatus.ACTIVE,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    include: {
      user: {
        select: {
          rollNumber: true,
          studentProfile: {
            select: {
              fullName: true
            }
          }
        }
      },
      extraItem: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      redeemedAt: "desc"
    }
  });

  return res.json({ redemptions });
});

router.patch("/redemptions/:id/fulfill", async (req, res) => {
  const redemption = await prisma.redemption.update({
    where: { id: req.params.id },
    data: {
      status: RedemptionStatus.FULFILLED,
      fulfilledAt: new Date()
    }
  });

  return res.json({ redemption });
});

export default router;
