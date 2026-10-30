import jwt from 'jsonwebtoken';

function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  return process.env.JWT_SECRET;
}

export function issueToken(user) {
  return jwt.sign({ sub: user._id.toString() }, secret(), { expiresIn: '2h', issuer: 'learnhub-api', audience: 'learnhub-client' });
}