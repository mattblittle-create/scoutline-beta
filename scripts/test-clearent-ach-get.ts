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
    "afde4ff5-3d8f-4cd5-868a-db2a142184a9";

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