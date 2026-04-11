const jwt = require('jsonwebtoken');
const db = require('../config');

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const ROLES = {
  ceo: ['dashboard', 'drivers', 'vehicles', 'logs', 'jobs', 'deliveries', 'payments', 'invoices', 'quotations', 'staff', 'recruitment', 'mechanics', 'analytics', 'rent-to-own'],
  hr: ['dashboard', 'drivers', 'vehicles', 'logs', 'jobs', 'deliveries', 'staff', 'recruitment', 'mechanics', 'analytics', 'rent-to-own'],
  accountant: ['dashboard', 'payments', 'invoices', 'quotations', 'analytics', 'rent-to-own'],
  secretary: ['dashboard', 'jobs', 'deliveries', 'quotations', 'rent-to-own']
};

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const clientIP = req.ip || req.connection.remoteAddress || '';
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === 'localhost' || clientIP === '::1' || clientIP.includes('127') || clientIP.includes('localhost');

  console.log(`[AUTH] Request from: ${clientIP}, isLocalhost: ${isLocalhost}, hasAuth: ${!!authHeader}`);

  // If there's an auth header, process it normally (for drivers and authenticated users)
  if (!authHeader) {
    if (isLocalhost) {
      // For localhost requests WITHOUT auth (ERP dashboard), set a default admin user
      req.user = { role: 'secretary', driver_id: null };
      return next();
    } else {
      // No auth header and not localhost
      return res.status(401).json({ error: 'No authorization header' });
    }
  }

  // Normal token processing
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    console.log(`[AUTH] Token verified for role: ${decoded.role}`);

    const processRequest = () => {
      // Block CEO from write operations
      if (req.user.role === 'ceo' && req.method !== 'GET') {
        return res.status(403).json({ error: 'CEO role is read-only. Data extraction only.' });
      }

      // Update last activity timestamp
      // For drivers, use driver_role format for session lookup
      const sessionRole = req.user.driver_id ? `driver_${req.user.driver_id}` : token;

      db.run(
        'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?',
        [token],
        (err) => {
          if (err) {
            console.error('Failed to update last activity:', err);
          }
        }
      );

      next();
    };

    // Validate session status in database
    db.get(
      'SELECT session_status FROM sessions WHERE token = ?',
      [token],
      (err, session) => {
        if (err) {
          console.error('[AUTH] Session validation error:', err);
          return res.status(500).json({ error: 'Session validation failed' });
        }

        // If no session exists, create one (for Supabase tokens)
        if (!session) {
          console.log('[AUTH] No session found for token, creating new session...');
          db.run(
            'INSERT OR REPLACE INTO sessions (token, user_role, session_status, logged_in_at, last_activity) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [token, req.user.role, 'active'],
            (err) => {
              if (err) {
                console.error('[AUTH] Failed to create/update session:', err);
                // If session creation fails, still allow the request - the user has a valid token
                console.log('[AUTH] Session creation failed but token is valid, proceeding anyway...');
                return processRequest();
              }
              console.log('[AUTH] Session created successfully for role:', req.user.role);
              processRequest();
            }
          );
          return;
        }

        if (session.session_status === 'invalidated') {
          console.log('[AUTH] Session invalidated for role:', req.user.role);
          return res.status(409).json({
            error: 'Your session was invalidated',
            conflict: true,
            message: 'Another user logged in with your role'
          });
        }

        console.log('[AUTH] Session valid, proceeding...');
        processRequest();
      }
    );
  } catch (err) {
    // If JWT verification fails and request is from localhost, grant default admin access
    if (isLocalhost) {
      console.log('[AUTH] JWT verification failed but localhost detected - granting default admin access');
      req.user = { role: 'secretary', driver_id: null };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

