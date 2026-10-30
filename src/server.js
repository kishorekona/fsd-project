import 'dotenv/config';
import { createApp } from './app.js';
import { connectToDatabase } from './db.js';

const port = Number(process.env.PORT) || 3000;

try {
  await connectToDatabase();
  const app = createApp();
  app.listen(port, () => console.log(`LearnHub API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not start LearnHub API:', error.message);
  process.exitCode = 1;
}