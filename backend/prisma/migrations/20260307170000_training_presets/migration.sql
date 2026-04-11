-- CreateTable
CREATE TABLE "training_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_preset_topics" (
    "presetId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_preset_topics_pkey" PRIMARY KEY ("presetId","topicId")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_presets_name_key" ON "training_presets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "training_preset_topics_presetId_position_key"
ON "training_preset_topics"("presetId", "position");

-- CreateIndex
CREATE INDEX "training_preset_topics_topicId_idx" ON "training_preset_topics"("topicId");

-- AddForeignKey
ALTER TABLE "training_preset_topics"
ADD CONSTRAINT "training_preset_topics_presetId_fkey"
FOREIGN KEY ("presetId") REFERENCES "training_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_preset_topics"
ADD CONSTRAINT "training_preset_topics_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
