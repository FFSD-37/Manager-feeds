import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";

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

    req.actor = actor;
    return next();
  } catch (e) {
    e.statusCode = 401;
    return next(e);
  }
};
