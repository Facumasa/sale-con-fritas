-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "requireGeolocation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "publicFichajeToken" TEXT;
CREATE UNIQUE INDEX "Restaurant_publicFichajeToken_key" ON "Restaurant"("publicFichajeToken");
