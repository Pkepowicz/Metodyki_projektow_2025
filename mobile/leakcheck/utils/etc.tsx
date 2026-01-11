export function calculateSeconds(
  expirationMinutes: string, expirationHours: string, expirationDays: string): number {
    var seconds: number = 0;
    if (expirationMinutes) {
      seconds += Number(expirationMinutes) * 60
    }
    if (expirationHours) {
      seconds += Number(expirationHours) * 3600 // 60 * 60
    }
    if (expirationDays) {
      seconds += Number(expirationDays) * 86400 // 3600 * 24
    }

    return seconds;
}