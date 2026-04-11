export type GeneratedInterviewPair = {
  interviewerId: string;
  intervieweeId: string;
};

export function generateDirectedCyclePairs(participantIds: string[]) {
  const shuffled = [...participantIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled.map((participantId, index): GeneratedInterviewPair => ({
    interviewerId: participantId,
    intervieweeId: shuffled[(index + 1) % shuffled.length],
  }));
}
