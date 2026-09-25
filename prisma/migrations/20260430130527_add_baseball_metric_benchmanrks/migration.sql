-- CreateEnum
CREATE TYPE "public"."BenchmarkScope" AS ENUM ('SCHOOL', 'CONFERENCE', 'DIVISION', 'GLOBAL');

-- CreateTable
CREATE TABLE "public"."BaseballMetricBenchmark" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scope" "public"."BenchmarkScope" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricLabel" TEXT,
    "averageValue" DECIMAL(8,2),
    "minValue" DECIMAL(8,2),
    "maxValue" DECIMAL(8,2),
    "unit" TEXT,
    "sampleSize" INTEGER,
    "sourceUrl" TEXT,
    "sourceNote" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "BaseballMetricBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaseballMetricBenchmark_scope_sourceKey_idx" ON "public"."BaseballMetricBenchmark"("scope", "sourceKey");

-- CreateIndex
CREATE INDEX "BaseballMetricBenchmark_position_idx" ON "public"."BaseballMetricBenchmark"("position");

-- CreateIndex
CREATE INDEX "BaseballMetricBenchmark_metricKey_idx" ON "public"."BaseballMetricBenchmark"("metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "BaseballMetricBenchmark_scope_sourceKey_position_metricKey_key" ON "public"."BaseballMetricBenchmark"("scope", "sourceKey", "position", "metricKey");
