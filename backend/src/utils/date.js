import { MealType } from "@prisma/client";

export function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function startOfWeek(date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

export function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function mealDeadline(mealDate, mealType) {
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
