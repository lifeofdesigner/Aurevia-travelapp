import "server-only";

type LogContext = Record<string, unknown>;
type LogLevel = "error" | "info" | "warn";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  }

  return {
    message: "Unknown error",
    value: error
  };
}

function writeLog(level: LogLevel, event: string, context?: LogContext) {
  const payload = {
    context: context ?? {},
    event,
    level,
    timestamp: new Date().toISOString()
  };
  const serializedPayload = JSON.stringify(payload);

  if (level === "error") {
    console.error(serializedPayload);
    return;
  }

  if (level === "warn") {
    console.warn(serializedPayload);
    return;
  }

  console.info(serializedPayload);
}

export function logServerEvent(event: string, context?: LogContext, level: LogLevel = "info") {
  writeLog(level, event, context);
}

export function reportServerError(
  event: string,
  error: unknown,
  context?: LogContext
) {
  writeLog("error", event, {
    ...(context ?? {}),
    error: serializeError(error)
  });
}
