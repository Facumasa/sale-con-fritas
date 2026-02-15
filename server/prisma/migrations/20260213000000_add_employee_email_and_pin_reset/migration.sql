-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "email" TEXT;
ALTER TABLE "Employee" ADD COLUMN "needsPinChange" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "pinResetToken" TEXT;
ALTER TABLE "Employee" ADD COLUMN "pinResetExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_pinResetToken_key" ON "Employee"("pinResetToken");
