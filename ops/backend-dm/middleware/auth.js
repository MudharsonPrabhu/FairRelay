const jwt = require('jsonwebtoken');
const { jwtConfig, verifyToken } = require('../config/jwt');
const prisma = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // ── DEV BYPASS (local only) ─────────────────────────────────────────────
    // Allows the frontend to skip OTP login during local development.
    // NEVER active in production (NODE_ENV === 'production' check is intentional).
    if (process.env.NODE_ENV !== 'production' && token === 'dev-bypass-real-data') {
      req.user = {
        id: 'dev-admin-001',
        name: 'Dev Admin',
        phone: '+919999999999',
        role: 'DISPATCHER',
        status: 'active',
        rating: 5,
        deliveriesCount: 0,
        totalEarnings: 0,
        weeklyEarnings: 0,
      };
      return next();
    }
    // ───────────────────────────────────────────────────────────────────────

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        rating: true,
        deliveriesCount: true,
        totalEarnings: true,
        weeklyEarnings: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
};
