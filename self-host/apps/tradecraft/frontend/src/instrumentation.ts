// Runs once when the server starts. The checks live in a Node-only file so the process can be stopped from there.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkStartup } = await import("./instrumentation-node");
    checkStartup();
  }
}
