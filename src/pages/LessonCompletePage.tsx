import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface LessonSummary {
  lesson_number: number; words_total: number; reviewed: number; new_words: number;
  correct: number; typo: number; incorrect: number; without_errors: number; suggestions_added: number;
  streak: { current: number; longest: number; today_done: boolean; extended_today: boolean; };
}

export default function LessonCompletePage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['lesson-summary', lessonId],
    queryFn: () => apiClient.get<LessonSummary>(`/lesson/${lessonId}/summary`),
    retry: false,
  });

  useEffect(() => {
    if (summary?.streak.extended_today) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [summary]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  if (error) {
    const apiError = error as any;
    if (apiError?.response?.data?.error?.code === 'lesson_not_completed') { navigate(`/lesson/${lessonId}/resume`); return null; }
    return (<div className="flex items-center justify-center min-h-screen"><div className="text-center"><p className="text-red-600 mb-4">Ошибка загрузки итогов</p><button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">На главную</button></div></div>);
  }
  if (!summary) return <div className="flex items-center justify-center min-h-screen">Итоги не найдены</div>;

  const accuracy = summary.words_total > 0 ? Math.round((summary.without_errors / summary.words_total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)] }} />
            ))}
          </div>
        </div>
      )}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 px-4 py-6 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-2">Урок завершён!</h1>
          <p className="text-green-100">Урок #{summary.lesson_number}</p>
        </div>
      </div>
      <div className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Статистика</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center"><div className="text-3xl font-bold text-gray-900">{summary.words_total}</div><div className="text-sm text-gray-600">Всего слов</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-blue-600">{accuracy}%</div><div className="text-sm text-gray-600">Точность</div></div>
            </div>
            <div className="space-y-2">
              {[["Повторено", summary.reviewed], ["Новых слов", summary.new_words], ["Без ошибок", summary.without_errors], ["Добавлено подсказок", summary.suggestions_added]].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">{label}</span><span className="font-medium text-gray-900">{val as number}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Результаты</h2>
            <div className="space-y-3">
              {[["#10b981", "Правильно", summary.correct], ["#f59e0b", "Опечатки", summary.typo], ["#ef4444", "Ошибки", summary.incorrect]].map(([color, label, val]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: color as string }} /><span className="text-gray-700">{label}</span></div>
                  <span className="font-medium text-gray-900">{val as number}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Серия занятий</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{summary.streak.current}</div>
                <div className="text-sm text-gray-600">Текущая серия</div>
                {summary.streak.extended_today && <div className="text-xs text-green-600 mt-1 animate-pulse">🔥 Продлена сегодня!</div>}
              </div>
              <div className="text-center"><div className="text-3xl font-bold text-purple-600">{summary.streak.longest}</div><div className="text-sm text-gray-600">Рекорд</div></div>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors">На главную</button>
        </div>
      </div>
      <style>{`
        .confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; }
        .confetti { position: absolute; width: 10px; height: 10px; top: -10px; animation: confetti-fall 3s linear forwards; }
        @keyframes confetti-fall { to { transform: translateY(100vh) rotate(720deg); } }
      `}</style>
    </div>
  );
}
