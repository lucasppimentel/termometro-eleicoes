const nextJest = require("next/jest");
require("dotenv").config({ path: ".env.development" });

const createJestConfig = nextJest();
const jestConfig = createJestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  testSequencer: "./customSequencer.js",
});

module.exports = jestConfig;
