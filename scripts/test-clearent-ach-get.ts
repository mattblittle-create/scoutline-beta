// scripts/test-clearent-ach-get.ts

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const {
    getClearentAchTransaction,
  } = await import(
    "../lib/payments/providers/clearentAchProvider"
  );

  const transactionId =
    "cc58f8a7-f694-4a0c-a444-26d1c5f3ffe0";

  const result =
    await getClearentAchTransaction(
      transactionId
    );

  console.dir(result, {
    depth: null,
  });
}

main().catch((error) => {
  console.error(
    "ACH_GET_TEST_FAILED",
    error
  );

  process.exit(1);
});