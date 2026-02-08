-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "distanceFromRestaurant" DOUBLE PRECISION,
ADD COLUMN     "lastFichajeSameDevice" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "fichajeRadiusMeters" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
