import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";

const auth = express.Router();

auth.post("/login", async (req, res, next) => {
  if (req.body) {
    const { username, password } = req.body;
    try {
      const user = await Admin.findOne({ username });

      if (!user || user.password !== password) {
        const err = new Error("Invalid credentials");
        err.statusCode = 401;
        return next(err);
      }

      const role = user.role || "admin";
      if (role !== "manager") {
        const err = new Error("Use admin portal to login");
        err.statusCode = 403;
        return next(err);
      }

      if (user.status === "suspended") {
        const err = new Error("Account suspended");
        err.statusCode = 403;
        return next(err);
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || process.env.USER_SECRET,
        { expiresIn: "1d" }
      );

      res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        msg: "Successfully extracted manager",
      });
    } catch (e) {
      e.statusCode = 400;
      e.message = "Error while fetching manager from mongoDB";
      return next(e);
    }
  } else {
    const err = new Error("Required fields are missing");
    err.statusCode = 401;
    return next(err);
  }
});

auth.get("/status", async (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    const err = new Error("Not authenticated");
    err.statusCode = 401;
    return next(err);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.USER_SECRET
    );
    const user = await Admin.findById(decoded.id).select("-password");

    if (!user) {
      const err = new Error("Not authenticated");
      err.statusCode = 401;
      return next(err);
    }

    const role = user.role || "admin";
    if (role !== "manager") {
      const err = new Error("Not authenticated for manager portal");
      err.statusCode = 403;
      return next(err);
    }

    if (user.status === "suspended") {
      const err = new Error("Account suspended");
      err.statusCode = 403;
      return next(err);
    }

    return res.status(200).json({
      isAuthenticated: true,
      user,
    });
  } catch (err) {
    err.statusCode = 401;
    return next(err);
  }
});

auth.post("/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  return res.status(200).json({
    success: true,
    msg: "Logged out",
  });
});

export default auth;
