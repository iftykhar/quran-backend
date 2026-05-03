import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import config from "../config";
import AppError from "../errors/AppError";

type TErrorSource = { path: string; message: string }[];

const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let errorSource: TErrorSource = [{ path: "", message: "Something went wrong" }];

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errorSource = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorSource = [{ path: "", message: error.message }];
  } else if (error instanceof Error) {
    message = error.message;
    errorSource = [{ path: "", message: error.message }];
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorSource,
    stack: config.nodeEnv === "development" ? error.stack : null,
  });
};

export default globalErrorHandler;
