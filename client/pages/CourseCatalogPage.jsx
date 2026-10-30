import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../context/AuthContext.jsx';
import CourseCard from '../components/CourseCard.jsx';

export default function CourseCatalogPage() {
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  useEffect(() => {
    setLoading(true); setError('');
    api.get('/courses', { params: { q: q || undefined, category: category || undefined, page, limit: 9 } })
      .then(({ data }) => { setCourses(data.courses); setPagination(data.pagination); })
      .catch((requestError) => setError(requestError.response?.data?.message || 'We couldn’t load the course library.'))
      .finally(() => setLoading(false));
  }, [q, category, page]);
  function updateParams(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if ('q' in changes || 'category' in changes) next.delete('page');
    setParams(next);
  }
  return <main className="catalog-page"><div className="catalog-hero"><span className="section-kicker">A GOOD PLACE TO BEGIN</span><h1>Find something<br />worth <em>learning.</em></h1><p>Real skills. Thoughtful teachers. A pace that feels like yours.</p><div className="catalog-hero-decoration">✳</div></div><div className="catalog-controls"><label className="catalog-search"><Search size={18} /><input placeholder="Try design, writing, product…" aria-label="Search courses" value={q} onChange={(event) => updateParams({ q: event.target.value })} /></label><label className="catalog-category"><SlidersHorizontal size={15} /><select aria-label="Filter by category" value={category} onChange={(event) => updateParams({ category: event.target.value })}><option value="">Every subject</option><option>Design</option><option>Product</option><option>Development</option><option>Business</option><option>Writing</option></select></label><span className="catalog-results">{pagination.total} {pagination.total === 1 ? 'COURSE' : 'COURSES'}</span></div>{loading ? <div className="catalog-course-grid">{Array.from({ length: 6 }, (_, index) => <div className="catalog-skeleton" key={index}><span /><i /><i /><b /></div>)}</div> : error ? <div className="catalog-empty"><strong>We hit a small snag.</strong><p>{error}</p><button onClick={() => updateParams({ page: String(page) })}>Try again</button></div> : courses.length ? <><div className="catalog-course-grid">{courses.map((course) => <CourseCard key={course._id} course={course} />)}</div><div className="catalog-pagination"><span>Page {pagination.page} of {pagination.pages}</span><div><button aria-label="Previous page" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}><ArrowLeft size={15} /></button><button aria-label="Next page" disabled={page >= pagination.pages} onClick={() => updateParams({ page: String(page + 1) })}><ArrowRight size={15} /></button></div></div></> : <div className="catalog-empty"><span>✳</span><strong>No courses found — yet.</strong><p>Try another search, or visit us again soon. Good things take a little time.</p><Link to="/courses">Clear filters <ArrowRight size={14} /></Link></div>}</main>;
}