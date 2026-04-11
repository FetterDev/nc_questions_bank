CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_name_key"
ON "companies"("name");

CREATE INDEX "companies_name_trgm_idx"
ON "companies"
USING GIN ("name" gin_trgm_ops);

ALTER TABLE "questions"
ADD COLUMN "companyId" TEXT;

CREATE INDEX "questions_companyId_idx"
ON "questions"("companyId");

ALTER TABLE "questions"
ADD CONSTRAINT "questions_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
