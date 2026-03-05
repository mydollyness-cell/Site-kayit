-- CreateTable
CREATE TABLE "Registration" (
    "id" SERIAL NOT NULL,
    "block" TEXT NOT NULL,
    "apartment_no" INTEGER NOT NULL,
    "resident_type" TEXT NOT NULL,
    "name_surname" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Registration_block_apartment_no_resident_type_key" ON "Registration"("block", "apartment_no", "resident_type");
