// Runs once when the server starts. A start that cannot be safe stops here with a plain message that names the setting
// and never its value (feature 002, FR-020, FR-021).
export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;
  const problems: string[] = [];

  const min = 32;
  for (const name of ["NEXTAUTH_SECRET", "SERVICE_TOKEN_SECRET"] as const) {
    const v = process.env[name] ?? "";
    if (!v) problems.push(`${name} is not set. See .env.example`);
    else if (v.length < min) problems.push(`${name} is shorter than ${min} bytes`);
  }
  const url = process.env.NEXTAUTH_URL ?? "";
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") problems.push("NEXTAUTH_URL must be an http or https address");
  } catch {
    problems.push("NEXTAUTH_URL is not set or is not an address, for example http://127.0.0.1:3100");
  }
  const env = (process.env.TRADECRAFT_ENV ?? "").trim();
  if (env !== "" && !["production", "local", "test"].includes(env)) {
    problems.push("TRADECRAFT_ENV must be production, local or test");
  }
  const production = env === "" || env === "production";
  if (production && (process.env.DEV_SESSION_SECRET ?? "") !== "") {
    problems.push(
      "DEV_SESSION_SECRET is set while TRADECRAFT_ENV is production: refusing to start. Remove it, or set TRADECRAFT_ENV to local for local work",
    );
  }
  if (problems.length > 0) {
    throw new Error("Stopping: " + problems.join("; "));
  }
}
