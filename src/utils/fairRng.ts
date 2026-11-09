/**
 * Velvet & Brass Calibrated House/Player RNG
 * Calibrated specifically so the player wins ~53% of the time
 * and the house wins ~47% of the time for an exhilarating, generous parlor experience.
 */
export function shouldPlayerWin53(): boolean {
  return Math.random() < 0.53;
}

/**
 * Returns a random integer between min and max inclusive
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
