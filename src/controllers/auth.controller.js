const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Auth = require('../models/auth.model');

async function login(req, res) {
  const body = req.body || {};
  const username =
    typeof body.username === 'string' ? body.username.trim() : '';
  const password =
    typeof body.password === 'string' ? body.password : '';


  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.',
      data: null
    });
  }

  try {
    const user = await Auth.findAdminByUsername(username);

    if (!user || user.role_name !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
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
        message: 'Invalid username or password.',
        data: null
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured.');
    }

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role_name
      },
      process.env.JWT_SECRET,
      {
        subject: String(user.user_id),
        expiresIn: '2h'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          userId: user.user_id,
          username: user.username,
          role: user.role_name
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);

    return res.status(500).json({
      success: false,
      message: 'A server error occurred during login.',
      data: null
    });
  }
}

function me(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Authenticated admin account.',
    data: {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role
    }
  });
}

module.exports = {
  login,
  me
};
