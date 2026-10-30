import { ArrowRight, BookOpen, Check, Clock3, LogOut, Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext.jsx';
import CourseCard from '../components/CourseCard.jsx';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/enrollments/me'), api.get('/assignments/me')])
      .then(([enrollmentResponse, assignmentResponse]) => {
        setEnrollments(enrollmentResponse.data.enrollments);
        setAssignments(assignmentResponse.data.assignments);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'We couldn’t load your learning dashboard.'))
      .finally(() => setBusy(false));
  }, []);

  const courses = enrollments.map((item) => ({ ...item.course, completionPercentage: item.completionPercentage }));
  const completedCourses = enrollments.filter((item) => item.status === 'completed').length;
  const isInstructor = ['instructor', 'admin'].includes(user?.role);

  return <main className="dashboard-page">
    <header className="dashboard-heading">
      <div><span className="section-kicker">{isInstructor ? 'INSTRUCTOR SPACE' : 'YOUR LEARNING SPACE'}</span>
        <h1>{isInstructor ? 'Welcome back,' : 'Good to see you,'}<br /><em>{user?.name?.split(' ')[0]}.</em></h1>
        <p>{isInstructor ? 'Your courses are making a difference. Here’s what’s happening.' : 'Every lesson is a little step toward somewhere new.'}</p>
      </div>
      <button className="dashboard-signout" onClick={signOut}><LogOut size={15} /> Sign out</button>
    </header>
    {error && <div className="form-error dashboard-error" role="alert">{error}</div>}
    <section className="dashboard-stats">
      <article><span>COURSES ENROLLED</span><strong>{busy ? '—' : enrollments.length}</strong><small>Your learning, your pace</small></article>
      <article><span>COURSES COMPLETED</span><strong>{busy ? '—' : completedCourses}</strong><small>Every finish is a beginning</small></article>
      <article><span>UPCOMING ASSIGNMENTS</span><strong>{busy ? '—' : assignments.length}</strong><small>Ready when you are</small></article>
      <article className="dashboard-stats-note"><Sparkles size={17} /><span>Consistency over intensity.<small>Small steps add up.</small></span></article>
    </section>
    <section className="dashboard-section">
      <div className="dashboard-section-heading"><div><span className="section-kicker">YOUR LEARNING PATH</span><h2>Courses in progress<span>.</span></h2></div>
        {isInstructor && <Link className="underlined-link" to="/instructor">Manage courses <ArrowRight size={15} /></Link>}
      </div>
      {busy ? <div className="catalog-course-grid">{[0, 1, 2].map((index) => <div className="catalog-skeleton" key={index}><span /><i /><i /><b /></div>)}</div>
        : courses.length ? <div className="catalog-course-grid">{courses.map((course) => <CourseCard key={course._id} course={course} />)}</div>
          : <div className="dashboard-empty"><span><BookOpen size={22} /></span><div><strong>Your first course is waiting.</strong><p>Pick something you’ve always wanted to learn. There’s no better time to begin.</p></div><Link to="/courses" className="button button-primary button-small">Explore courses <ArrowRight size={15} /></Link></div>}
    </section>
    <section className="dashboard-section assignments-dashboard">
      <div className="dashboard-section-heading"><div><span className="section-kicker">KEEP THE MOMENTUM</span><h2>Upcoming assignments<span>.</span></h2></div></div>
      {busy ? <div className="assignment-skeleton" /> : assignments.length
        ? <div className="dashboard-assignment-list">{assignments.map((assignment) => <article key={assignment._id}><span className="assignment-bullet"><Clock3 size={16} /></span><div><strong>{assignment.title}</strong><small>{assignment.course?.title || 'Course'} · due {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div><Link to={`/assignments/${assignment._id}`} aria-label={`Open ${assignment.title}`}><Play size={15} /></Link></article>)}</div>
        : <div className="assignment-empty"><Check size={16} /> No assignments due soon. Enjoy the breathing room.</div>}
    </section>
  </main>;
}