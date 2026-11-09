"use strict";

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

function parseUserId(value) {
  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value)
  ) {
    return null;
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function getUsername(req) {
  const body = req.body || {};

  const value =
    body.username ?? body.user_name;

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

function getRoleId(req) {
  const body = req.body || {};

  const value =
    body.roleId ?? body.role_id;

  const roleId = Number(value);

  if (
    !Number.isSafeInteger(roleId) ||
    roleId <= 0
  ) {
    return null;
  }

  return roleId;
}

async function getUsers(req, res) {
  try {
    const users = await Auth.getUsers();

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "A server error occurred while retrieving users.",
      data: null
    });
  }
}

async function getUserById(req, res) {
  const userId = parseUserId(req.params.id);

  if (userId === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
      data: null
    });
  }

  try {
    const user = await Auth.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "A server error occurred while retrieving the user.",
      data: null
    });
  }
}

async function createUser(req, res) {
  const username = getUsername(req);
  const roleId = getRoleId(req);

  const password =
    typeof req.body?.password === "string"
      ? req.body.password
      : "";

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username is required.",
      data: null
    });
  }

  if (username.length > 80) {
    return res.status(400).json({
      success: false,
      message: "Username must not exceed 80 characters.",
      data: null
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required.",
      data: null
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters.",
      data: null
    });
  }

  if (roleId === null) {
    return res.status(400).json({
      success: false,
      message: "roleId is required and must be valid.",
      data: null
    });
  }

  try {
    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const user = await Auth.createUser(
      username,
      passwordHash,
      roleId
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: user
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "That username already exists.",
        data: null
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "The selected role does not exist.",
        data: null
      });
    }

    console.error("Create user error:", error);

    return res.status(500).json({
      success: false,
      message: "A server error occurred while creating the user.",
      data: null
    });
  }
}


async function updateUser(req, res) {
  const userId = parseUserId(req.params.id);
  const username = getUsername(req);
  const roleId = getRoleId(req);

  const password =
    typeof req.body?.password === "string"
      ? req.body.password
      : "";

  if (userId === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
      data: null
    });
  }

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username is required.",
      data: null
    });
  }

  if (username.length > 80) {
    return res.status(400).json({
      success: false,
      message: "Username must not exceed 80 characters.",
      data: null
    });
  }

  if (roleId === null) {
    return res.status(400).json({
      success: false,
      message: "roleId is required and must be valid.",
      data: null
    });
  }

  if (password && password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters.",
      data: null
    });
  }

  try {
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : null;

    const user = await Auth.updateUser(
      userId,
      username,
      roleId,
      passwordHash
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "That username already exists.",
        data: null
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "The selected role does not exist.",
        data: null
      });
    }

    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "A server error occurred while updating the user.",
      data: null
    });
  }
}

async function deleteUser(req, res) {
  const userId = parseUserId(req.params.id);

  if (userId === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
      data: null
    });
  }

  try {
    const deleted = await Auth.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: null
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "A server error occurred while deleting the user.",
      data: null
    });
  }
}

module.exports = {
  login,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
