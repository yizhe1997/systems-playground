export function mintSession(o: { email: string; secret: string | undefined; sessionAt?: number; stepUpAt?: number }): Promise<string>;
export function sessionCookieName(origin?: string): string;
export function serviceToken(o: {
  sub: string;
  secret: string | undefined;
  role?: "owner" | "system";
  sessionAt?: number;
  stepUpAt?: number;
}): string;
