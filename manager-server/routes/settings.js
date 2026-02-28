import express from "express";
import Admin from "../models/admin.js";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export const setting = express.Router();

setting.post("/updateSettings", async (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    const err = new Error("Bad request found");
    err.statusCode = 401;
    return next(err);
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Admin.findById(decode.id);

    switch (req.body.tab) {
      case "security": {
        const {
          currentPassword,
          newPassword,
          confirmPassword,
          twoFactorEnabled,
        } = req.body.data;

        let isMatch = false;
        if (
          user.password &&
          typeof user.password === "string" &&
          user.password.startsWith("$2")
        ) {
          isMatch = Boolean(currentPassword, user.password);
        } else {
          isMatch = Boolean(currentPassword === user.password);
        }

        if (!isMatch) {
          const err = new Error("Incorrect password");
          err.statusCode = 401;
          return next(err);
        }

        if (newPassword || confirmPassword) {
          if (newPassword !== confirmPassword) {
            const err = new Error("Both passwords should match");
            err.statusCode = 400;
            return next(err);
          }
          user.password = newPassword;
        }

        if (twoFactorEnabled === true && !user.twoFactorEnabled) {
          const secret = speakeasy.generateSecret({
            name: "Feeds Admin",
          });

          user.twoFactorEnabled = true;
          user.twoFactorSecret = secret.base32;
          await user.save();

          const qrCode = await QRCode.toDataURL(secret.otpauth_url);

          return res.status(200).json({
            success: true,
            msg: "Two-factor authentication enabled",
            qrCode,
          });
        }

        if (twoFactorEnabled === false && user.twoFactorEnabled) {
          user.twoFactorEnabled = false;
          user.twoFactorSecret = undefined;
          await user.save();

          return res.status(200).json({
            success: true,
            msg: "Two-factor authentication disabled",
          });
        }

        await user.save();

        return res.status(200).json({
          success: true,
          msg: "Security details updated",
        });
      }

      case "profile": {
        const { name, email } = req.body.data;
        try {
          user.username = name;
          user.email = email;
          await user.save();

          return res.status(201).json({
            success: true,
            msg: "Details updated!!",
          });
        } catch (e) {
          e.statusCode = 400;
          e.message = "Error saving new Details";
          return next(e);
        }
      }
    }
  } catch (e) {
    e.statusCode = 500;
    e.message = "Internal server error, try re-login";
    return next(e);
  }
});

setting.post("/verify-2fa", async (req, res, next) => {
  try {
    const { otp } = req.body;
    const token = req.cookies.auth_token;

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Admin.findById(decode.id).select("+twoFactorSecret");

    if (!user || !user.twoFactorSecret) {
      const err = new Error(
        "Two-factor authentication is not enabled for this account"
      );
      err.statusCode = 400;
      return next(err);
    }

    const tokenStr = String(otp || "").trim();

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: tokenStr,
      window: 2,
    });

    if (!verified) {
      const err = new Error("Invalid OTP");
      err.statusCode = 400;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      msg: "Two-factor authentication verified",
    });
  } catch (e) {
    e.statusCode = 500;
    return next(e);
  }
});
