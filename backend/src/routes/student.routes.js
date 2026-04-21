import { MealType, PointTransactionType, RedemptionStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { addDays, mealDeadline, startOfDay, startOfWeek } from "../utils/date.js";
import { generateRedemptionCode } from "../utils/redemption.js";

const router = Router();

router.use(requireAuth, requireRole(Role.STUDENT));

router.get("/dashboard", async (req, res) => {
  const today = startOfDay(new Date());
  const entries = await prisma.menuEntry.findMany({
    where: {
      mealDate: {
        gte: today,
        lt: addDays(today, 1)
      }
    },
    orderBy: {
      mealType: "asc"
    }
  });

  const optOuts = await prisma.mealOptOut.findMany({
    where: {
      userId: req.user.id,
      menuEntryId: {
        in: entries.map((entry) => entry.id)
      }
    }
  });

  const meals = entries.map((entry) => {
    const optOut = optOuts.find((record) => record.menuEntryId === entry.id);
    const deadlineAt = mealDeadline(entry.mealDate, entry.mealType);

    return {
      ...entry,
      deadlineAt,
      optOutStatus: optOut
        ? {
            optedOutAt: optOut.optedOutAt,
            isBeforeDeadline: optOut.isBeforeDeadline,
            pointsAwarded: optOut.pointsAwarded
          }
        : null
    };
  });

  const extras = await prisma.extraItem.findMany({
    where: { isActive: true },
    orderBy: [{ pointsCost: "asc" }, { name: "asc" }]
  });

  return res.json({
    user: {
      id: req.user.id,
      rollNumber: req.user.rollNumber,
      pointsBalance: req.user.pointsBalance,
      studentProfile: req.user.studentProfile
    },
    meals,
    extras
  });
});

router.get("/menu/today", async (req, res) => {
  const today = startOfDay(new Date());
  const entries = await prisma.menuEntry.findMany({
    where: {
      mealDate: {
        gte: today,
        lt: addDays(today, 1)
      }
    },
    orderBy: {
      mealType: "asc"
    }
  });

  return res.json({ entries });
});

router.post("/opt-outs", async (req, res) => {
  const schema = z.object({
    mealType: z.nativeEnum(MealType),
    mealDate: z.string().datetime().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid opt-out payload.", errors: parsed.error.flatten() });
  }

  const targetDate = parsed.data.mealDate ? startOfDay(parsed.data.mealDate) : startOfDay(new Date());
  const entry = await prisma.menuEntry.findUnique({
    where: {
      mealDate_mealType: {
        mealDate: targetDate,
        mealType: parsed.data.mealType
      }
    }
  });

  if (!entry) {
    return res.status(404).json({ message: "Meal entry not found." });
  }

  const existing = await prisma.mealOptOut.findUnique({
    where: {
      userId_menuEntryId: {
        userId: req.user.id,
        menuEntryId: entry.id
      }
    }
  });

  if (existing) {
    return res.status(409).json({ message: "Meal already opted out." });
  }

  const deadlineAt = mealDeadline(entry.mealDate, entry.mealType);
  const now = new Date();
  const isBeforeDeadline = now <= deadlineAt;
  const pointsAwarded = isBeforeDeadline ? 10 : 0;

  const result = await prisma.$transaction(async (tx) => {
    const optOut = await tx.mealOptOut.create({
      data: {
        userId: req.user.id,
        menuEntryId: entry.id,
        deadlineAt,
        optedOutAt: now,
        isBeforeDeadline,
        pointsAwarded
      }
    });

    if (pointsAwarded > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: req.user.id,
          type: PointTransactionType.EARNED_OPT_OUT,
          points: pointsAwarded,
          description: `Earned for opting out of ${entry.mealType.toLowerCase()} on ${entry.mealDate.toISOString().slice(0, 10)}`,
          referenceId: optOut.id
        }
      });

      await tx.user.update({
        where: { id: req.user.id },
        data: {
          pointsBalance: {
            increment: pointsAwarded
          }
        }
      });
    }

    return optOut;
  });

  const refreshedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  return res.status(201).json({
    optOut: result,
    pointsBalance: refreshedUser.pointsBalance
  });
});

router.post("/opt-outs/bulk", async (req, res) => {
  const schema = z.object({
    fromDate: z.string().date(),
    toDate: z.string().date(),
    mealTypes: z.array(z.nativeEnum(MealType)).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid bulk opt-out payload.", errors: parsed.error.flatten() });
  }

  const fromDate = startOfDay(parsed.data.fromDate);
  const toDate = startOfDay(parsed.data.toDate);

  if (fromDate > toDate) {
    return res.status(400).json({ message: "From date must be before or equal to to date." });
  }

  const totalDays = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (totalDays > 30) {
    return res.status(400).json({ message: "Date range cannot exceed 30 days." });
  }

  const dates = [];
  for (let offset = 0; offset < totalDays; offset += 1) {
    dates.push(addDays(fromDate, offset));
  }

  const summary = await prisma.$transaction(async (tx) => {
    const entries = await tx.menuEntry.findMany({
      where: {
        mealDate: {
          gte: fromDate,
          lt: addDays(toDate, 1)
        },
        mealType: {
          in: parsed.data.mealTypes
        }
      }
    });

    const entryMap = new Map(
      entries.map((entry) => [`${startOfDay(entry.mealDate).toISOString()}-${entry.mealType}`, entry])
    );

    const existingOptOuts = await tx.mealOptOut.findMany({
      where: {
        userId: req.user.id,
        menuEntryId: {
          in: entries.map((entry) => entry.id)
        }
      }
    });

    const existingMenuEntryIds = new Set(existingOptOuts.map((optOut) => optOut.menuEntryId));
    const now = new Date();
    let optedOut = 0;
    let skipped = 0;
    let pointsEarned = 0;

    for (const date of dates) {
      for (const mealType of parsed.data.mealTypes) {
        const entry = entryMap.get(`${startOfDay(date).toISOString()}-${mealType}`);

        if (!entry || existingMenuEntryIds.has(entry.id)) {
          skipped += 1;
          continue;
        }

        const deadlineAt = mealDeadline(entry.mealDate, entry.mealType);
        const isBeforeDeadline = now <= deadlineAt;
        const pointsAwarded = isBeforeDeadline ? 10 : 0;

        const optOut = await tx.mealOptOut.create({
          data: {
            userId: req.user.id,
            menuEntryId: entry.id,
            deadlineAt,
            optedOutAt: now,
            isBeforeDeadline,
            pointsAwarded
          }
        });

        existingMenuEntryIds.add(entry.id);
        optedOut += 1;
        pointsEarned += pointsAwarded;

        if (pointsAwarded > 0) {
          await tx.pointTransaction.create({
            data: {
              userId: req.user.id,
              type: PointTransactionType.EARNED_OPT_OUT,
              points: pointsAwarded,
              description: `Earned for opting out of ${entry.mealType.toLowerCase()} on ${entry.mealDate.toISOString().slice(0, 10)}`,
              referenceId: optOut.id
            }
          });
        }
      }
    }

    const updatedUser = pointsEarned > 0
      ? await tx.user.update({
          where: { id: req.user.id },
          data: {
            pointsBalance: {
              increment: pointsEarned
            }
          }
        })
      : await tx.user.findUnique({
          where: { id: req.user.id }
        });

    return {
      totalProcessed: dates.length * parsed.data.mealTypes.length,
      optedOut,
      skipped,
      pointsEarned,
      newBalance: updatedUser.pointsBalance
    };
  });

  return res.status(201).json(summary);
});

router.get("/points/history", async (req, res) => {
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" }
  });

  return res.json({
    pointsBalance: req.user.pointsBalance,
    transactions
  });
});

router.get("/redemptions", async (req, res) => {
  const redemptions = await prisma.redemption.findMany({
    where: { userId: req.user.id },
    include: { extraItem: true },
    orderBy: { redeemedAt: "desc" }
  });

  return res.json({ redemptions });
});

router.post("/redemptions", async (req, res) => {
  const schema = z.object({
    extraItemId: z.string().cuid()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid redemption payload.", errors: parsed.error.flatten() });
  }

  const item = await prisma.extraItem.findFirst({
    where: {
      id: parsed.data.extraItemId,
      isActive: true
    }
  });

  if (!item) {
    return res.status(404).json({ message: "Extra item not found." });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (currentUser.pointsBalance < item.pointsCost) {
    return res.status(400).json({ message: "Insufficient points balance." });
  }

  const redemption = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: req.user.id },
      data: {
        pointsBalance: {
          decrement: item.pointsCost
        }
      }
    });

    await tx.pointTransaction.create({
      data: {
        userId: req.user.id,
        type: PointTransactionType.REDEEMED_EXTRA,
        points: -item.pointsCost,
        description: `Redeemed ${item.name}`,
        referenceId: item.id
      }
    });

    return tx.redemption.create({
      data: {
        userId: req.user.id,
        extraItemId: item.id,
        pointsSpent: item.pointsCost,
        redemptionCode: generateRedemptionCode(),
        status: RedemptionStatus.ACTIVE,
        expiresAt: addDays(new Date(), 1)
      },
      include: {
        extraItem: true
      }
    });
  });

  const refreshedUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  return res.status(201).json({
    redemption,
    pointsBalance: refreshedUser.pointsBalance
  });
});

router.get("/meal-history", async (req, res) => {
  const weekStart = startOfWeek(new Date());
  const entries = await prisma.menuEntry.findMany({
    where: {
      mealDate: {
        gte: addDays(weekStart, -7),
        lt: addDays(weekStart, 7)
      }
    },
    include: {
      mealOptOuts: {
        where: { userId: req.user.id }
      },
      attendances: {
        where: { userId: req.user.id }
      },
      ratings: {
        where: { userId: req.user.id }
      }
    },
    orderBy: [{ mealDate: "desc" }, { mealType: "desc" }]
  });

  const history = entries.map((entry) => ({
    id: entry.id,
    mealDate: entry.mealDate,
    mealType: entry.mealType,
    title: entry.title,
    items: entry.items,
    optedOut: entry.mealOptOuts.length > 0,
    attended: entry.attendances.some((attendance) => attendance.wasPresent),
    rating: entry.ratings[0]?.rating ?? null
  }));

  return res.json({ history });
});

router.post("/ratings", async (req, res) => {
  const schema = z.object({
    menuEntryId: z.string().cuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(280).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid rating payload.", errors: parsed.error.flatten() });
  }

  const entry = await prisma.menuEntry.findUnique({
    where: { id: parsed.data.menuEntryId }
  });

  if (!entry) {
    return res.status(404).json({ message: "Meal entry not found." });
  }

  if (startOfDay(entry.mealDate) >= startOfDay(new Date())) {
    return res.status(400).json({ message: "Ratings are allowed only after the meal date." });
  }

  const attendance = await prisma.attendance.findUnique({
    where: {
      userId_menuEntryId: {
        userId: req.user.id,
        menuEntryId: entry.id
      }
    }
  });

  if (!attendance?.wasPresent) {
    return res.status(400).json({ message: "Only attended meals can be rated." });
  }

  const rating = await prisma.mealRating.upsert({
    where: {
      userId_menuEntryId: {
        userId: req.user.id,
        menuEntryId: entry.id
      }
    },
    create: {
      userId: req.user.id,
      menuEntryId: entry.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment
    }
  });

  return res.status(201).json({ rating });
});

export default router;
