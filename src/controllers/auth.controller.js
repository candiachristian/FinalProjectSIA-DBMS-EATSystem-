const bcrypt = require("bcryptjs");
const Auth = require("../models/auth.model");

async function login(req, res) {
  const body = req.body || {};

  const username =
    typeof body.username === "string"
      ? body.username.trim()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
      data: null
    });
  }

  try {
    const user = await Auth.findAdminByUsername(username);

    if (!user || user.role_name !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
        data: null
      });
    }

    const passwordIsCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordIsCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: {
          userId: user.user_id,
          username: user.username,
          role: user.role_name
        }
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "A server error occurred during login.",
      data: null
    });
  }
}

module.exports = {
  login
};
