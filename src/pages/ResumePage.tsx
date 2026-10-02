import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface CurrentExercise { exercise_id: number; sentence: string; order_index: number; exercises_done: number; exercises_total: number; }

export default function ResumePage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  const { data: current, isLoading, error } = useQuery({
    queryKey: ['lesson-current', lessonId],
    queryFn: () => apiClient.get<CurrentExercise>(`/lesson/${lessonId}/current`),
    retry: false,
  });

  const abandonMutation = useMutation({
    mutationFn: () => apiClient.post(`/lesson/${lessonId}/abandon`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-current', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/');
    },
    onError: () => { setShowAbandonModal(false); },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  if (error) {
    const apiError = error as any;
    if (apiError?.error?.code === 'lesson_not_active' || apiError?.response?.data?.error?.code === 'lesson_not_active') { navigate(`/lesson/${lessonId}/summary`); return null; }
    return (<div className="flex items-center justify-center min-h-screen"><div className="text-center"><p className="text-red-600 mb-4">Ошибка загрузки урока</p><button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">На главную</button></div></div>);
  }
  if (!current) return <div className="flex items-center justify-center min-h-screen">Урок не найден</div>;

  const progress = current.exercises_total > 0 ? (current.exercises_done / current.exercises_total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3"><div className="max-w-2xl mx-auto"><h1 className="text-lg font-medium text-gray-900">Незавершённый урок</h1></div></div>
      <div className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Прогресс</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{current.exercises_done} из {current.exercises_total}</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Следующее упражнение</h2>
            <p className="text-lg text-gray-900">{current.sentence}</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => navigate(`/lesson/${lessonId}/exercise/${current.exercise_id}`)} className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors">Продолжить</button>
            <button onClick={() => setShowAbandonModal(true)} disabled={abandonMutation.isPending} className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">Начать заново</button>
          </div>
        </div>
      </div>
      {showAbandonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Начать урок заново?</h3>
            <p className="text-gray-600 mb-4">Текущий урок будет закрыт. Лимит уроков на сегодня уже израсходован и не вернётся.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAbandonModal(false)} disabled={abandonMutation.isPending} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Отмена</button>
              <button onClick={() => abandonMutation.mutate()} disabled={abandonMutation.isPending} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">Начать заново</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
