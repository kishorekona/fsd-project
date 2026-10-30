import { ArrowUpRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  const instructor = course.instructor?.name || 'LearnHub instructor';
  const lessons = course.modules?.reduce((count, item) => count + (item.lessons?.length || 0), 0) || 0;
  return <article className="catalog-course-card"><Link className="catalog-course-image" to={`/courses/${course._id}`}>
    {course.thumbnail ? <img src={course.thumbnail} alt="" loading="lazy" /> : <span className="catalog-placeholder"><span>{course.category?.slice(0, 1) || 'L'}</span></span>}
    <span className="catalog-level">{course.level || 'All levels'}</span><span className="catalog-open"><ArrowUpRight size={17} /></span>
  </Link><div className="catalog-card-content"><span className="catalog-category">{course.category || 'Learning'}</span><h3><Link to={`/courses/${course._id}`}>{course.title}</Link></h3><p>{course.shortDescription || course.description || 'A practical course designed to help you learn by doing.'}</p><div className="catalog-card-meta"><span>{instructor}</span><span><Clock3 size={13} /> {course.estimatedDurationMinutes ? `${Math.round(course.estimatedDurationMinutes / 60)} hrs` : `${lessons} lessons`}</span></div></div></article>;
}