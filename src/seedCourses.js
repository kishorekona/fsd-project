import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Course, User } from './models.js';
import { connectToDatabase } from './db.js';

const courses = [
  {
    title: 'Product Thinking: From Problem to Plan',
    slug: 'product-thinking-from-problem-to-plan',
    category: 'Product',
    level: 'beginner',
    shortDescription: 'Turn customer problems into a focused product strategy and a testable roadmap.',
    description: 'Learn a practical product discovery workflow: understand the people you serve, frame the problem, choose what to solve, and communicate a clear plan. This original course is designed around hands-on exercises rather than a rigid template.',
    estimatedDurationMinutes: 210
  },
  {
    title: 'Product Discovery and Customer Interviews',
    slug: 'product-discovery-customer-interviews',
    category: 'Product',
    level: 'beginner',
    shortDescription: 'Ask better research questions and turn interview notes into useful product insight.',
    description: 'Practice planning lightweight research, conducting unbiased customer conversations, and synthesizing observations into opportunity areas your team can act on.',
    estimatedDurationMinutes: 180
  },
  {
    title: 'Metrics That Help Products Improve',
    slug: 'metrics-that-help-products-improve',
    category: 'Product',
    level: 'intermediate',
    shortDescription: 'Choose meaningful product measures and build a habit of learning from them.',
    description: 'Connect user outcomes to product metrics, distinguish leading signals from lagging results, and design a simple review that leads to better decisions.',
    estimatedDurationMinutes: 240
  },
  {
    title: 'Visual Design Foundations',
    slug: 'visual-design-foundations',
    category: 'Design',
    level: 'beginner',
    shortDescription: 'Build confidence with layout, hierarchy, color, and type through small design exercises.',
    description: 'A practical introduction to visual communication. Learn to create clear hierarchy, use spacing consistently, and make deliberate color and typography choices.',
    estimatedDurationMinutes: 200
  },
  {
    title: 'UX Research for Everyday Teams',
    slug: 'ux-research-for-everyday-teams',
    category: 'Design',
    level: 'beginner',
    shortDescription: 'Plan lean usability studies and turn what you observe into design improvements.',
    description: 'Learn approachable research methods for teams of any size, from writing a study plan to sharing findings in a way that supports clear next steps.',
    estimatedDurationMinutes: 160
  },
  {
    title: 'Accessible Interface Design',
    slug: 'accessible-interface-design',
    category: 'Design',
    level: 'intermediate',
    shortDescription: 'Design more inclusive interfaces with practical accessibility checks and patterns.',
    description: 'Explore contrast, keyboard access, readable content, focus, and component states. Apply a repeatable accessibility review to a small interface.',
    estimatedDurationMinutes: 220
  },
  {
    title: 'JavaScript for the Browser',
    slug: 'javascript-for-the-browser',
    category: 'Development',
    level: 'beginner',
    shortDescription: 'Learn core JavaScript by building interactive features for a web page.',
    description: 'Understand values, functions, arrays, events, and the DOM, then bring them together in small browser-based projects with clear, incremental exercises.',
    estimatedDurationMinutes: 300
  },
  {
    title: 'React: Components and State',
    slug: 'react-components-and-state',
    category: 'Development',
    level: 'intermediate',
    shortDescription: 'Compose reusable React interfaces and manage state with confidence.',
    description: 'Practice breaking a user interface into components, passing data with props, handling user input, and keeping state close to where it is used.',
    estimatedDurationMinutes: 270
  },
  {
    title: 'APIs and Node.js Essentials',
    slug: 'apis-and-nodejs-essentials',
    category: 'Development',
    level: 'intermediate',
    shortDescription: 'Build a small HTTP API and learn the fundamentals of server-side JavaScript.',
    description: 'Create routes, validate incoming data, return useful errors, and connect an API to a data store while keeping responsibilities easy to understand.',
    estimatedDurationMinutes: 320
  },
  {
    title: 'Business Fundamentals for Builders',
    slug: 'business-fundamentals-for-builders',
    category: 'Business',
    level: 'beginner',
    shortDescription: 'Understand customers, value, costs, and the choices behind a sustainable business.',
    description: 'A clear introduction to business models and basic financial thinking, with exercises that help turn an idea into a set of testable assumptions.',
    estimatedDurationMinutes: 190
  },
  {
    title: 'Project Planning Without the Overhead',
    slug: 'project-planning-without-overhead',
    category: 'Business',
    level: 'beginner',
    shortDescription: 'Scope work, manage dependencies, and keep a project moving with a lightweight plan.',
    description: 'Learn to define outcomes, break work into manageable pieces, surface risks early, and communicate progress without creating process for its own sake.',
    estimatedDurationMinutes: 150
  },
  {
    title: 'Communicating with Data',
    slug: 'communicating-with-data',
    category: 'Business',
    level: 'intermediate',
    shortDescription: 'Make clearer decisions and presentations by matching evidence to the question.',
    description: 'Practice asking precise questions, reading simple summaries, choosing an effective chart, and explaining uncertainty to a non-specialist audience.',
    estimatedDurationMinutes: 230
  },
  {
    title: 'Clear Writing for Busy Readers',
    slug: 'clear-writing-for-busy-readers',
    category: 'Writing',
    level: 'beginner',
    shortDescription: 'Write concise, useful material with a clear purpose and structure.',
    description: 'Improve clarity by identifying the reader and their task, organizing ideas around a central point, and editing sentences for precision and flow.',
    estimatedDurationMinutes: 140
  },
  {
    title: 'Writing Helpful Documentation',
    slug: 'writing-helpful-documentation',
    category: 'Writing',
    level: 'intermediate',
    shortDescription: 'Create documentation that helps people complete real tasks and find answers.',
    description: 'Learn to structure task-based guides, use examples effectively, keep terminology consistent, and maintain documentation as a product changes.',
    estimatedDurationMinutes: 180
  },
  {
    title: 'Storytelling for Presentations',
    slug: 'storytelling-for-presentations',
    category: 'Writing',
    level: 'beginner',
    shortDescription: 'Shape a presentation around one audience, one purpose, and a memorable through-line.',
    description: 'Move from a loose collection of slides to a focused narrative. Choose supporting evidence, write informative headings, and end with a clear next step.',
    estimatedDurationMinutes: 170
  }
];

try {
  await connectToDatabase();
  let instructor = await User.findOne({ email: 'teaching-team@learnhub.local' });
  if (!instructor) {
    instructor = await User.create({
      name: 'LearnHub Teaching Team',
      email: 'teaching-team@learnhub.local',
      passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
      role: 'instructor',
      requestedRole: 'instructor',
      isApproved: true
    });
  }

  let added = 0;
  for (const course of courses) {
    const result = await Course.updateOne(
      { slug: course.slug },
      { $setOnInsert: { ...course, instructor: instructor._id, isPublished: true, isArchived: false } },
      { upsert: true }
    );
    if (result.upsertedCount) added += 1;
  }
  console.log(`Course seed complete: added ${added} new courses; ${courses.length - added} already existed.`);
} catch (error) {
  console.error('Could not seed courses:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}