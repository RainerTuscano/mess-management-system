// Menu source: KUBER HEALTH FOOD AND ALLIED SERVICES PVT LTD
// NIT Goa Mess Menu - March 2026 (repeating weekly template)
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, Branch, Gender, Hostel, MealType, PointTransactionType, RedemptionStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

const BRANCHES = [Branch.CSE, Branch.ECE, Branch.MCE, Branch.EEE, Branch.CVE];
const DEFAULT_BATCHES = [2022, 2023, 2024, 2025];
const FIRST_NAMES = [
  "Aarav", "Aditi", "Akash", "Ananya", "Arjun", "Bhavya", "Diya", "Ishaan", "Kavya", "Krish",
  "Meera", "Neha", "Nikhil", "Priya", "Rhea", "Rohit", "Saanvi", "Sai", "Tanvi", "Vihaan"
];
const LAST_NAMES = [
  "Acharya", "Bhat", "Desai", "Gowda", "Iyer", "Kadam", "Kulkarni", "Naik", "Pai", "Patil",
  "Rao", "Reddy", "Sharma", "Shetty", "Singh", "Varma"
];

const EXTRA_ITEMS = [
  { name: "Omelette", pointsCost: 30, description: "Fresh two-egg omelette." },
  { name: "Lassi", pointsCost: 20, description: "Sweet chilled lassi." },
  { name: "Curd", pointsCost: 15, description: "Plain curd cup." },
  { name: "Boiled Eggs", pointsCost: 20, description: "Two boiled eggs." },
  { name: "Fruit Bowl", pointsCost: 25, description: "Seasonal cut fruit bowl." }
];

const WEEKLY_MENU_TEMPLATE = {
  BREAKFAST: [
    ["Kada Poha", "Coconut Chutney", "Milk/Bournvita", "Banana", "Boiled Egg", "Tea & Coffee", "Bread Butter Jam"],
    ["Thepla", "Tea & Coffee", "Milk/Oats", "Water Melon", "Boiled Egg", "Tea & Coffee", "Bread Butter Jam"],
    ["Sabudana Khichdi", "Coconut Chutney", "Seasonal Fruits", "Boiled Egg", "Tea & Coffee", "Curd Chutney", "Bread Butter Jam"],
    ["Veg Upma", "Sambhar", "Milk", "Banana", "Boiled Egg", "Tea & Coffee"],
    ["Idli", "Sambhar & Chutney", "Milk/Bournvita", "Water Melon", "Boiled Egg", "Tea & Coffee"],
    ["Poha", "Coconut Chutney", "Milk/Bournvita", "Seasonal Fruits", "Boiled Eggs", "Tea & Coffee"],
    ["Varma Chelli", "Coconut Chutney", "Milk/Bournvita", "Water Melon", "Boiled Egg", "Tea & Coffee"]
  ],
  LUNCH: [
    ["Rajma Masala", "Dal Fry", "Rice", "Chapatti", "Salad/Pickle"],
    ["Chole Punjabi", "Cabbage", "Biryani", "Rice", "Salad/Pickle"],
    ["Matki Usal", "Soya", "Sambhar", "Veg Pulav", "Salad/Pickle", "Chapatti"],
    ["Black Masoor", "Green Peas", "Dal Tadka", "Veg Rayta", "Rice", "Salad/Pickle", "Chapatti"],
    ["Moong Masala", "Palak Rice", "Steam Rice", "Salad/Pickle", "Chapatti"],
    ["Chole", "Dal Fry", "Rice", "Salad/Pickle", "Chapatti"],
    ["Soyabean Tikka", "Rice", "Salad/Pickle"]
  ],
  SNACKS: [
    ["Veg Hakka Noodles", "Sauce", "Tea & Coffee"],
    ["Bread Poha", "Sauce", "Tea & Coffee"],
    ["Pasta", "Tea & Coffee", "Lemon Juice"],
    ["Mayo Sandwich", "Tomato Sauce", "Tea"],
    ["Pav Bhaji", "Onion & Lemon", "Tea"],
    ["Masala Idli / Dhokla", "Green Chutney", "Tea"],
    ["Veg Maggi", "Tomato Sauce", "Tea/Coffee"]
  ],
  DINNER: [
    ["Mix Malwani Masala", "Punjabi Kadhi", "Steam Rice", "Chapatti", "Salad/Pickle", "Savai Kheer"],
    ["Black Chana Masala", "Dal Lassoni", "Steam Rice", "Chapatti", "Salad/Pickle", "Fruits Custard"],
    ["Chicken/Paneer Butter Masala", "Dal Fry", "Steam Rice", "Chapatti", "Salad/Pickle", "Rice Firni"],
    ["Mushroom Corn Masala", "Besan Raita", "Masala Rice", "Chapatti", "Salad/Pickle", "Shira"],
    ["Egg Curry / Veg Korma", "Dal", "Steam Rice", "Chapatti", "Salad/Pickle", "Ice Cream"],
    ["Methi Malai Mutter", "Dal", "Steam Rice", "Chapatti", "Salad/Pickle", "Pineapple Shira"],
    ["Chicken Biryani / Paneer Biryani", "Log", "Steam Rice", "Chapatti", "Salad/Pickle"]
  ]
};

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function mealDeadline(mealDate, mealType) {
  const deadline = new Date(mealDate);
  deadline.setSeconds(0, 0);

  if (mealType === MealType.BREAKFAST) {
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(21, 0, 0, 0);
    return deadline;
  }

  if (mealType === MealType.LUNCH) {
    deadline.setHours(9, 0, 0, 0);
    return deadline;
  }

  if (mealType === MealType.SNACKS) {
    deadline.setHours(13, 0, 0, 0);
    return deadline;
  }

  deadline.setHours(16, 0, 0, 0);
  return deadline;
}

function buildRollNumber(batchYear, branch, serial) {
  const yearPrefix = String(batchYear).slice(-2);
  const serialToken = String(1000 + serial).padStart(4, "0");
  return `${yearPrefix}${branch.toLowerCase()}${serialToken}`;
}

function buildStudentName(batchYear, branch, serial, gender) {
  const firstOffset = (batchYear + serial + branch.charCodeAt(0)) % FIRST_NAMES.length;
  const lastOffset = (batchYear + serial + branch.charCodeAt(branch.length - 1)) % LAST_NAMES.length;
  const prefix = gender === Gender.FEMALE ? "Ms." : "Mr.";
  return `${prefix} ${FIRST_NAMES[firstOffset]} ${LAST_NAMES[lastOffset]}`;
}

function buildMenuEntry(dayIndex, mealType, mealDate) {
  const items = WEEKLY_MENU_TEMPLATE[mealType][dayIndex];
  return {
    mealDate,
    mealType,
    title: items[0],
    description: items.slice(1).join(", "),
    items
  };
}

function createMealEntries(weekStart) {
  const entries = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const mealDate = addDays(weekStart, dayIndex);
    entries.push(buildMenuEntry(dayIndex, MealType.BREAKFAST, mealDate));
    entries.push(buildMenuEntry(dayIndex, MealType.LUNCH, mealDate));
    entries.push(buildMenuEntry(dayIndex, MealType.SNACKS, mealDate));
    entries.push(buildMenuEntry(dayIndex, MealType.DINNER, mealDate));
  }
  return entries;
}

function sampleEligibleStudents(studentUsers, divisor, remainder) {
  return studentUsers.filter((_, index) => index % divisor === remainder);
}

function addHours(date, hours) {
  const value = new Date(date);
  value.setHours(value.getHours() + hours);
  return value;
}

function buildRedemptionCode(rollNumber, itemName, index) {
  const itemToken = itemName.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  return `${itemToken}-${rollNumber.slice(-4)}-${String(index + 1).padStart(3, "0")}`;
}

async function main() {
  const defaultStudentPassword = process.env.DEFAULT_STUDENT_PASSWORD || "student123";
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const batches = DEFAULT_BATCHES;

  const studentPasswordHash = await bcrypt.hash(defaultStudentPassword, 12);
  const adminPasswordHash = await bcrypt.hash(defaultAdminPassword, 12);

  await prisma.mealRating.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.redemption.deleteMany();
  await prisma.extraItem.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.mealOptOut.deleteMany();
  await prisma.menuEntry.deleteMany();
  await prisma.menuWeek.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();

  const admins = [
    {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN
    },
    {
      username: "messmanager",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN
    }
  ];

  const createdAdmins = [];
  for (const admin of admins) {
    const user = await prisma.user.create({ data: admin });
    createdAdmins.push(user);
  }

  const primaryAdmin = createdAdmins[0];
  const studentUsers = [];

  for (const batchYear of batches) {
    for (const branch of BRANCHES) {
      for (let serial = 1; serial <= 60; serial += 1) {
        const gender = serial <= 30 ? Gender.MALE : Gender.FEMALE;
        const hostel = serial <= 30 ? Hostel.BOYS : Hostel.GIRLS;
        const rollNumber = buildRollNumber(batchYear, branch, serial);

        const user = await prisma.user.create({
          data: {
            rollNumber,
            passwordHash: studentPasswordHash,
            role: Role.STUDENT,
            studentProfile: {
              create: {
                fullName: buildStudentName(batchYear, branch, serial, gender),
                batchYear,
                branch,
                serial,
                gender,
                hostel,
                messName: hostel === Hostel.BOYS ? "Boys Hostel Mess" : "Girls Hostel Mess"
              }
            }
          },
          include: {
            studentProfile: true
          }
        });

        studentUsers.push(user);
      }
    }
  }

  for (const item of EXTRA_ITEMS) {
    await prisma.extraItem.create({ data: item });
  }

  const currentWeekStart = startOfWeek(new Date());
  const previousWeekStart = addDays(currentWeekStart, -7);
  const seededWeeks = [];

  for (const weekStart of [previousWeekStart, currentWeekStart]) {
    const createdWeek = await prisma.menuWeek.create({
      data: {
        weekStart,
        createdById: primaryAdmin.id,
        entries: {
          create: createMealEntries(weekStart)
        }
      },
      include: {
        entries: true
      }
    });
    seededWeeks.push(createdWeek);
  }

  const currentWeek = seededWeeks.find((week) => week.weekStart.getTime() === currentWeekStart.getTime());
  const today = startOfDay(new Date());
  const todayEntries = currentWeek.entries.filter((entry) => startOfDay(entry.mealDate).getTime() === today.getTime());
  const lunchEntry = todayEntries.find((entry) => entry.mealType === MealType.LUNCH);
  const dinnerEntry = todayEntries.find((entry) => entry.mealType === MealType.DINNER);
  const yesterday = addDays(today, -1);
  const yesterdaySourceWeek = yesterday < currentWeekStart
    ? seededWeeks.find((week) => week.weekStart.getTime() === previousWeekStart.getTime())
    : currentWeek;
  const yesterdayEntries = yesterdaySourceWeek.entries.filter((entry) => startOfDay(entry.mealDate).getTime() === yesterday.getTime());
  const breakfastEntry = yesterdayEntries.find((entry) => entry.mealType === MealType.BREAKFAST);

  const earlyOptOutStudents = sampleEligibleStudents(studentUsers, 12, 0);
  for (const student of earlyOptOutStudents) {
    const entry = lunchEntry || dinnerEntry;
    if (!entry) {
      continue;
    }

    const pointsAwarded = 10;
    const deadlineAt = mealDeadline(entry.mealDate, entry.mealType);
await prisma.mealOptOut.create({
  data: {
    userId: student.id,
    menuEntryId: entry.id,
    deadlineAt,
    optedOutAt: addHours(deadlineAt, -4),
        isBeforeDeadline: true,
        pointsAwarded
      }
    });

    await prisma.pointTransaction.create({
      data: {
        userId: student.id,
        type: PointTransactionType.EARNED_OPT_OUT,
        points: pointsAwarded,
        description: `Earned for opting out of ${entry.mealType.toLowerCase()} on ${entry.mealDate.toISOString().slice(0, 10)}`,
        referenceId: entry.id
      }
    });

    await prisma.user.update({
      where: { id: student.id },
      data: {
        pointsBalance: {
          increment: pointsAwarded
        }
      }
    });
  }

  const lateOptOutStudents = sampleEligibleStudents(studentUsers, 15, 1);
  for (const student of lateOptOutStudents) {
    if (!dinnerEntry) {
      continue;
    }

    const deadlineAt = mealDeadline(dinnerEntry.mealDate, dinnerEntry.mealType);
    await prisma.mealOptOut.create({
      data: {
        userId: student.id,
        menuEntryId: dinnerEntry.id,
        deadlineAt,
        optedOutAt: addHours(deadlineAt, 2),
        isBeforeDeadline: false,
        pointsAwarded: 0
      }
    });
  }

  const bonusStudents = earlyOptOutStudents.slice(0, 25);
  for (const student of bonusStudents) {
    await prisma.pointTransaction.create({
      data: {
        userId: student.id,
        type: PointTransactionType.MANUAL_ADJUSTMENT,
        points: 30,
        description: "Seed bonus points for redemption demo"
      }
    });

    await prisma.user.update({
      where: { id: student.id },
      data: {
        pointsBalance: {
          increment: 30
        }
      }
    });
  }

  const attendanceStudents = sampleEligibleStudents(studentUsers, 8, 0);
  for (const student of attendanceStudents) {
    if (!breakfastEntry) {
      continue;
    }

    await prisma.attendance.create({
      data: {
        userId: student.id,
        menuEntryId: breakfastEntry.id,
        wasPresent: true
      }
    });

    await prisma.mealRating.create({
      data: {
        userId: student.id,
        menuEntryId: breakfastEntry.id,
        rating: (student.studentProfile.serial % 5) + 1,
        comment: "Seeded feedback entry."
      }
    });
  }

  const extraItems = await prisma.extraItem.findMany({ orderBy: { pointsCost: "asc" } });
  const redemptionStudents = earlyOptOutStudents.slice(0, Math.min(25, earlyOptOutStudents.length));
  for (let index = 0; index < redemptionStudents.length; index += 1) {
    const student = redemptionStudents[index];
    const item = extraItems[index % extraItems.length];

    const pointsSpent = item.pointsCost;
    await prisma.redemption.create({
      data: {
        userId: student.id,
        extraItemId: item.id,
        pointsSpent,
        redemptionCode: buildRedemptionCode(student.rollNumber, item.name, index),
        status: index % 4 === 0 ? RedemptionStatus.FULFILLED : RedemptionStatus.ACTIVE,
        expiresAt: addDays(new Date(), 1),
        fulfilledAt: index % 4 === 0 ? new Date() : null
      }
    });

    await prisma.pointTransaction.create({
      data: {
        userId: student.id,
        type: PointTransactionType.REDEEMED_EXTRA,
        points: -pointsSpent,
        description: `Redeemed ${item.name}`,
        referenceId: item.id
      }
    });

    await prisma.user.update({
      where: { id: student.id },
      data: {
        pointsBalance: {
          decrement: pointsSpent
        }
      }
    });
  }

  console.log(`Seed completed with ${studentUsers.length} students, ${createdAdmins.length} admins, and ${seededWeeks.length} menu weeks.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
