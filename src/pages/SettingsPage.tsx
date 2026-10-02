import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../api/client";

const COMMON_TIMEZONES = [
  "Europe/Moscow","Europe/Kiev","Europe/Berlin","Europe/Paris","Europe/London",
  "Europe/Warsaw","Europe/Prague","Europe/Vienna","Europe/Rome","Europe/Madrid",
  "America/New_York","America/Los_Angeles","Asia/Tokyo","Asia/Shanghai",
];

const SettingsPage: React.FC = () => {
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTimezoneChange = async () => {
    if (!showWarning) { setShowWarning(true); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      await apiClient.patch("/settings/timezone", { timezone });
      setSuccess("Часовой пояс успешно изменён"); setShowWarning(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      if (err.error?.code === "timezone_change_too_soon") {
        setError("Смена часового пояса возможна только раз в 7 дней.");
      } else setError(err.error?.message || "Ошибка изменения часового пояса");
    } finally { setLoading(false); }
  };

  return (
    <div className="app-content py-8">
      <button onClick={() => navigate("/profile")} className="mb-4 text-indigo-600 hover:text-indigo-700 flex items-center gap-1">← Назад к профилю</button>
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Часовой пояс</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Текущий часовой пояс</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={loading} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
            {COMMON_TIMEZONES.map((tz) => (<option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>))}
          </select>
        </div>
        {showWarning && <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800">⚠️ Смена часового пояса меняет границу дня. Следующую смену можно будет сделать через 7 дней.</p></div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-600">{success}</p></div>}
        <button onClick={handleTimezoneChange} disabled={loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors">
          {loading ? "Сохранение..." : showWarning ? "Подтвердить изменение" : "Изменить часовой пояс"}
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Настройки обучения</h2>
        <button onClick={() => navigate("/learning-profile")} className="w-full px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors">Открыть настройки обучения →</button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Аккаунт</h2>
        <p className="text-sm text-gray-600 mb-4">{user?.email}</p>
        <button onClick={() => navigate("/auth")} className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors">Выйти из аккаунта</button>
      </div>
    </div>
  );
};

export default SettingsPage;
