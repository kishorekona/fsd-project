import { ArrowLeft, ArrowRight, Check, Clock3, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../context/AuthContext.jsx';

export default function QuizPage() {
  const { quizId } = useParams(); const navigate = useNavigate(); const [quiz, setQuiz] = useState(null); const [answers, setAnswers] = useState([]); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/quizzes/${quizId}`).then(({ data }) => { setQuiz(data.quiz); setAnswers(Array(data.quiz.questions.length).fill(null)); }).catch((e) => setError(e.response?.data?.message || 'Quiz unavailable.')); }, [quizId]);
  async function submit(event) {
    event.preventDefault(); if (answers.some((answer) => answer === null)) return setError('Answer every question before submitting.');
    setBusy(true); setError('');
    try { const { data } = await api.post(`/quizzes/${quizId}/attempts`, { answers }); setResult(data); }
    catch (e) { setError(e.response?.data?.message || 'Your quiz could not be submitted.'); }
    finally { setBusy(false); }
  }
  if (error && !quiz) return <main className="catalog-page"><div className="catalog-empty"><strong>Quiz unavailable.</strong><p>{error}</p><Link to="/dashboard">Back to dashboard</Link></div></main>;
  if (!quiz) return <main className="catalog-page"><div className="details-loading">Loading quiz…</div></main>;
  return <main className="quiz-page"><Link className="details-back" to="/dashboard"><ArrowLeft size={15} /> Back to learning</Link><header className="quiz-heading"><span className="section-kicker">A CHANCE TO CHECK IN</span><h1>{quiz.title}</h1><p>{quiz.instructions || 'Take your time, read each question, and trust what you’ve learned.'}</p><span><Clock3 size={14} /> Passing score: {quiz.passingScore}%</span></header>{result ? <section className={`quiz-result${result.attempt.passed ? ' quiz-passed' : ''}`}><div className="result-icon"><Check size={25} /></div><span className="section-kicker">{result.attempt.passed ? 'A LOVELY MILESTONE' : 'GOOD PRACTICE'}</span><h2>{result.attempt.score}%</h2><p>{result.correct} out of {result.total} answers correct</p><small>{result.attempt.passed ? 'You passed. Every step forward counts.' : 'Every attempt teaches you something.'} {result.attemptsRemaining} attempts remaining.</small><button className="button button-primary" onClick={() => navigate('/dashboard')}>Back to your dashboard <ArrowRight size={15} /></button></section> : <form className="quiz-form" onSubmit={submit}>{quiz.questions.map((question, index) => <fieldset key={question._id || index}><legend><span>QUESTION {String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><div className="quiz-options">{question.options.map((option, optionIndex) => <label className={answers[index] === optionIndex ? 'option-selected' : ''} key={`${index}-${optionIndex}`}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((current) => current.map((answer, i) => i === index ? optionIndex : answer))} /> <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>{option}</label>)}</div></fieldset>)}{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Checking your answers…' : 'Submit quiz'} <Send size={15} /></button></form>}</main>;
}