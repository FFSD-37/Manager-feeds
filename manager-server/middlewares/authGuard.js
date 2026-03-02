import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";

const normalizeManagerType = (rawType) => {
  if (!rawType) return null;

  if (["users", "user", "kids", "channel", "channels"].includes(rawType)) {
    return "users";
  }

  if (["posts", "post"].includes(rawType)) {
    return "posts";
  }

  if (["feedback and revenue", "feedback_revenue", "revenue"].includes(rawType)) {
    return "feedback and revenue";
  }

  return rawType;
};

export const requireManagerAuth = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      const err = new Error("Not authenticated");
      err.statusCode = 401;
      return next(err);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.USER_SECRET
    );

    const actor = await Admin.findById(decoded.id);
    if (!actor) {
      const err = new Error("Not authenticated");
      err.statusCode = 401;
      return next(err);
    }

    const role = actor.role || "admin";
    if (role !== "manager") {
      const err = new Error("Access denied. Manager role required");
      err.statusCode = 403;
      return next(err);
    }

    if (actor.status === "suspended") {
      const err = new Error("Account suspended");
      err.statusCode = 403;
      return next(err);
    }

    const managerType = normalizeManagerType(actor.managerType);
    if (!managerType) {
      const err = new Error("Manager type is not assigned");
      err.statusCode = 403;
      return next(err);
    }

    actor.managerType = managerType;

    req.actor = actor;
    return next();
  } catch (e) {
    e.statusCode = 401;
    return next(e);
  }
};
