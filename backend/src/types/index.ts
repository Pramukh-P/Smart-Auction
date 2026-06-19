import { Request } from "express";
import { Types } from "mongoose";

export interface AuthenticatedRequest extends Request {
  user?: any;
  files?: any;
}

export interface SendEmailParams {
  email: string;
  subject: string;
  message: string;
  html?: string;
}
