-- AlterTable
ALTER TABLE "QuoteSheet" ADD COLUMN "quoteNumber" TEXT;
ALTER TABLE "QuoteSheet" ADD COLUMN "title" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSheet_quoteNumber_key" ON "QuoteSheet"("quoteNumber");