import { execSync } from "child_process";

export async function setup() {
  execSync("npx prisma db push --schema=prisma/schema.prisma", {
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
    stdio: "pipe",
  });
}

export async function teardown() {
  const { unlinkSync, existsSync } = await import("fs");
  if (existsSync("prisma/test.db")) unlinkSync("prisma/test.db");
}
