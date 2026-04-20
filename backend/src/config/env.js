function requireEnv(name) {
  const value = process.env[name];
  if (value == null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

requireEnv("DATABASE_URL");

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD || "student123",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "admin123"
};
