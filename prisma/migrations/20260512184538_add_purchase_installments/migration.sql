-- CreateEnum
CREATE TYPE "PurchaseInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "PurchaseInstallment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "competenceMonth" INTEGER NOT NULL,
    "competenceYear" INTEGER NOT NULL,
    "status" "PurchaseInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseInstallment_userId_idx" ON "PurchaseInstallment"("userId");

-- CreateIndex
CREATE INDEX "PurchaseInstallment_purchaseId_idx" ON "PurchaseInstallment"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseInstallment_competenceMonth_competenceYear_idx" ON "PurchaseInstallment"("competenceMonth", "competenceYear");

-- CreateIndex
CREATE INDEX "PurchaseInstallment_status_idx" ON "PurchaseInstallment"("status");

-- CreateIndex
CREATE INDEX "CreditCardUser_userId_idx" ON "CreditCardUser"("userId");

-- CreateIndex
CREATE INDEX "CreditCardUser_creditCardId_idx" ON "CreditCardUser"("creditCardId");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE INDEX "Purchase_creditCardId_idx" ON "Purchase"("creditCardId");

-- CreateIndex
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- AddForeignKey
ALTER TABLE "PurchaseInstallment" ADD CONSTRAINT "PurchaseInstallment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInstallment" ADD CONSTRAINT "PurchaseInstallment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
