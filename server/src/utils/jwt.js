var jwt = require('jsonwebtoken');
var config = require('../config');

function generateToken(userInfo) {
  return jwt.sign(userInfo, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function verifyToken(token) {
  try {
    return { valid: true, data: jwt.verify(token, config.jwt.secret) };
  } catch (err) {
    return { valid: false, data: null };
  }
}

module.exports = { generateToken: generateToken, verifyToken: verifyToken };
