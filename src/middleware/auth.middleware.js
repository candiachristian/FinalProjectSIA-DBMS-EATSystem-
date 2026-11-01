const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required.',
      data: null
    });
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required.',
      data: null
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured.');

    return res.status(500).json({
      success: false,
      message: 'Server authentication is not configured.',
      data: null
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access is required.',
        data: null
      });
    }

    req.user = {
      userId: Number(decoded.sub),
      username: decoded.username,
      role: decoded.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is invalid or expired.',
      data: null
    });
  }
}

module.exports = {
  requireAdmin
};
