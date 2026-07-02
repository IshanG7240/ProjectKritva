import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * ESLint configuration for Node.js library packages (api, db, payments,
 * notifications, types).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
