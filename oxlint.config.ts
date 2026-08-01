import { defineConfig } from "oxlint";

export default defineConfig({
    options: {
        typeAware: true,
        typeCheck: true,
    },
    rules: {
        /**
         * @privateRemarks
         * strict-boolean-expressions is desired, but cannot be utilized until we enable strictNullChecks in typescript
         * no-floating-promises may be desirable, but largely throws a lot of annoying warnings on tests
         * no-useless-default-assignment throws a lot of annoying warnings about strictNullChecks
         * - AC
         */
        "typescript/strict-boolean-expressions": "allow",
        "typescript/no-floating-promises": "allow",
        "typescript/no-useless-default-assignment": "allow",
    },
    ignorePatterns: ["Test"],
});
