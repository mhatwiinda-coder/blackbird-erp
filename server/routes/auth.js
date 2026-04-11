const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login endpoint with session management
router.post('/login', (req, res) => {
  const { role, password } = req.body;

  if (!role || !password) {
    return res.status(400).json({ error: 'Role and password required' });
  }

  db.get('SELECT * FROM users WHERE role = ?', [role.toLowerCase()], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid role or password' });
    }

    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid role or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        SECRET,
        { expiresIn: '24h' }
      );

      // Check for existing active session
      db.get('SELECT id FROM sessions WHERE user_role = ? AND session_status = ?',
        [user.role, 'active'],
        (err, existingSession) => {

          if (existingSession) {
            // Log the conflict
            db.run(
              'INSERT INTO session_conflicts (user_role, previous_session_id, action) VALUES (?, ?, ?)',
              [user.role, existingSession.id, 'login_conflict'],
              () => {
                // Invalidate previous session
                db.run(
                  'UPDATE sessions SET session_status = ? WHERE id = ?',
                  ['invalidated', existingSession.id]
                );
              }
            );
          }

          // Create new session
          const deviceInfo = req.headers['user-agent'] || 'Unknown';
          const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

          db.run(
            'INSERT OR REPLACE INTO sessions (user_role, token, device_info, ip_address, logged_in_at, last_activity, session_status) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)',
            [user.role, token, deviceInfo, ipAddress, 'active'],
            function(err) {
              if (err) {
                console.error('Session creation error:', err);
                return res.status(500).json({ error: 'Session creation failed' });
              }

              const newSessionId = this.lastID;

              // Check if any OTHER role is currently active (global concurrency check)
              db.all(
                'SELECT user_role FROM sessions WHERE user_role != ? AND session_status = ?',
                [user.role, 'active'],
                (err, otherSessions) => {
                  const activeOtherUsers = (otherSessions || []).map(s => s.user_role);
                  res.json({
                    token,
                    role: user.role,
                    sessionId: newSessionId,
                    hasConflict: existingSession ? true : false,
                    anotherUserActive: activeOtherUsers.length > 0,
                    activeUsers: activeOtherUsers,
                    message: 'Login successful'
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// Driver login endpoint
router.post('/driver-login', (req, res) => {
  const { driverId, password } = req.body;

  if (!driverId || !password) {
    return res.status(400).json({ error: 'Driver ID and password required' });
  }

  // Query users table for driver account
  db.get(
    'SELECT u.id, u.driver_id, u.password_hash, d.name FROM users u JOIN drivers d ON u.driver_id = d.id WHERE u.driver_id = ? AND u.account_type = ?',
    [driverId, 'driver'],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid driver ID or password' });
      }

      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: 'Authentication error' });
        }

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid driver ID or password' });
        }

        // Generate JWT token with driver_id instead of role
        const token = jwt.sign(
          { id: user.id, driver_id: user.driver_id, name: user.name, account_type: 'driver' },
          SECRET,
          { expiresIn: '24h' }
        );

        // Create/update session in database
        const deviceInfo = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

        db.run(
          'INSERT OR REPLACE INTO sessions (user_role, token, device_info, ip_address, logged_in_at, last_activity, session_status) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)',
          [`driver_${user.driver_id}`, token, deviceInfo, ipAddress, 'active'],
          function(err) {
            if (err) {
              console.error('Session creation error:', err);
              return res.status(500).json({ error: 'Session creation failed' });
            }

            res.json({
              token,
              driverId: user.driver_id,
              driverName: user.name,
              sessionId: this.lastID,
              message: 'Driver login successful'
            });
          }
        );
      });
    }
  );
});

// Logout endpoint (invalidate session)
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  db.run(
    'UPDATE sessions SET session_status = ? WHERE token = ?',
    ['invalidated', token],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    }
  );
});

// Session status check endpoint (for polling)
router.get('/session-status', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  db.get(
    'SELECT user_role, session_status FROM sessions WHERE token = ?',
    [token],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session) {
        return res.status(401).json({ error: 'Session not found' });
      }

      if (session.session_status === 'invalidated') {
        return res.status(409).json({
          error: 'Your session was terminated',
          conflict: true,
          invalidated: true,
          message: 'Another user logged in with your role'
        });
      }

      // Update last activity
      db.run(
        'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?',
        [token]
      );

      // Check if any other role is currently active
      db.all(
        'SELECT user_role FROM sessions WHERE user_role != ? AND session_status = ?',
        [session.user_role, 'active'],
        (err, otherSessions) => {
          const activeOtherUsers = (otherSessions || []).map(s => s.user_role);
          res.json({
            status: 'active',
            role: session.user_role,
            conflict: false,
            anotherUserActive: activeOtherUsers.length > 0,
            activeUsers: activeOtherUsers
          });
        }
      );
    }
  );
});

// Change password endpoint (invalidate all sessions for that role)
router.post('/change-password', (req, res) => {
  const { role, currentPassword, newPassword } = req.body;

  if (!role || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  db.get('SELECT * FROM users WHERE role = ?', [role.toLowerCase()], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    bcrypt.compare(currentPassword, user.password_hash, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ error: 'Password hashing error' });
        }

        db.run(
          'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE role = ?',
          [hash, role.toLowerCase()],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Password update failed' });
            }

            // Invalidate all existing sessions when password is changed
            db.run(
              'UPDATE sessions SET session_status = ? WHERE user_role = ?',
              ['invalidated', role.toLowerCase()]
            );

            res.json({ message: 'Password changed successfully. Please log in again.' });
          }
        );
      });
    });
  });
});

module.exports = router;

