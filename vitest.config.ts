import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    globalSetup: "src/__tests__/globalSetup.ts",
    setupFiles: ["src/__tests__/setup.ts"],
    env: {
      DATABASE_URL: "file:./prisma/test.db",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/lib/prisma.ts"],
    },
  },
});
