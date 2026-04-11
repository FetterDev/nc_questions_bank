CREATE TABLE "question_interview_encounters" (
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_interview_encounters_pkey" PRIMARY KEY ("questionId","userId")
);

CREATE INDEX "question_interview_encounters_userId_idx"
ON "question_interview_encounters"("userId");

ALTER TABLE "question_interview_encounters"
ADD CONSTRAINT "question_interview_encounters_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_interview_encounters"
ADD CONSTRAINT "question_interview_encounters_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
