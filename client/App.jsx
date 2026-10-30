import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CourseCatalogPage from './pages/CourseCatalogPage.jsx';
import CourseDetailsPage from './pages/CourseDetailsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InstructorPage from './pages/InstructorPage.jsx';
import LearningPage from './pages/LearningPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import AssignmentPage from './pages/AssignmentPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { Link } from 'react-router-dom';
import CourseQuizzesPage from './pages/CourseQuizzesPage.jsx';

function NotFound() {
  return <main className="not-found"><span className="section-kicker">A WRONG TURN, THAT’S ALL</span><h1>Nothing here<br /><em>just yet.</em></h1><p>The page may have moved, or perhaps it’s still being made.</p><Link className="button button-primary" to="/">Back to LearnHub <span>↗</span></Link></main>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes><Route element={<SiteLayout />}><Route index element={<LandingPage />} /><Route path="courses" element={<CourseCatalogPage />} /><Route path="courses/:courseId" element={<CourseDetailsPage />} /><Route path="login" element={<AuthPage mode="login" />} /><Route path="register" element={<AuthPage mode="register" />} /><Route element={<ProtectedRoute />}><Route path="dashboard" element={<DashboardPage />} /><Route path="courses/:courseId/learn" element={<LearningPage />} /><Route path="courses/:courseId/quizzes" element={<CourseQuizzesPage />} /><Route path="quizzes/:quizId" element={<QuizPage />} /><Route path="assignments/:assignmentId" element={<AssignmentPage />} /></Route><Route element={<ProtectedRoute roles={['instructor', 'admin']} />}><Route path="instructor" element={<InstructorPage />} /></Route><Route element={<ProtectedRoute roles={['admin']} />}><Route path="admin" element={<AdminPage />} /></Route><Route path="*" element={<NotFound />} /></Route></Routes></AuthProvider></BrowserRouter>;
}