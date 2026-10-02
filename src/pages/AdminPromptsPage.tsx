import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

interface PromptListItem { key: string; updated_at: string | null; updated_by: number | null; }
interface PromptDetail { key: string; system_template: string; required_placeholders: string[]; updated_at: string | null; updated_by: number | null; }

const AdminPromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { loadPrompts(); }, []);

  const loadPrompts = async () => {
    try { setLoading(true); setError(null); const data = await apiClient.get<PromptListItem[]>("/admin/prompts"); setPrompts(data); }
    catch (err) { setError("Не удалось загрузить промпты"); console.error(err); }
    finally { setLoading(false); }
  };

  const loadPromptDetail = async (key: string) => {
    try { setLoading(true); setError(null); const data = await apiClient.get<PromptDetail>(`/admin/prompts/${key}`); setSelectedPrompt(data); setTemplate(data.system_template); setEditing(false); }
    catch (err) { setError("Не удалось загрузить промпт"); console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;
    try {
      setLoading(true); setError(null); setSuccess(null);
      await apiClient.put(`/admin/prompts/${selectedPrompt.key}`, { system_template: template });
      setSuccess("Промпт сохранён"); setEditing(false); await loadPromptDetail(selectedPrompt.key);
    } catch (err: any) { setError(err.error?.message || "Не удалось сохранить"); }
    finally { setLoading(false); }
  };

  const formatDate = (dateString: string | null) => { if (!dateString) return "Никогда"; return new Date(dateString).toLocaleString("ru-RU"); };

  return (
    <div className="app-content py-8">
      <button onClick={() => navigate("/admin")} className="mb-4 text-indigo-600 hover:text-indigo-700">← Назад в админку</button>
      <h1 className="text-2xl font-bold mb-6">Промпты LLM</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-600">{success}</p></div>}
      {!selectedPrompt ? (
        <div>{loading ? <div className="text-center py-8"><p className="text-gray-500">Загрузка...</p></div> : (
          <div className="space-y-2">{prompts.map((prompt) => (
            <div key={prompt.key} onClick={() => loadPromptDetail(prompt.key)} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div><h3 className="font-medium text-gray-900">{prompt.key}</h3><p className="text-sm text-gray-500">Обновлено: {formatDate(prompt.updated_at)}</p></div>
              </div>
            </div>
          ))}</div>
        )}</div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setSelectedPrompt(null)} className="text-indigo-600 hover:text-indigo-700">← К списку промптов</button>
            <h2 className="text-xl font-bold">{selectedPrompt.key}</h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">Обновлено: {formatDate(selectedPrompt.updated_at)}</p>
              {!editing && <button onClick={() => setEditing(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Редактировать</button>}
            </div>
            {selectedPrompt.required_placeholders.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800"><strong>Плейсхолдеры:</strong> {selectedPrompt.required_placeholders.map((p) => `{${p}}`).join(", ")}</p>
              </div>
            )}
            {editing ? (
              <div>
                <textarea value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="mt-4 flex gap-2">
                  <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Сохранение..." : "Сохранить"}</button>
                  <button onClick={() => { setEditing(false); setTemplate(selectedPrompt.system_template); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Отмена</button>
                </div>
              </div>
            ) : (
              <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">{selectedPrompt.system_template}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromptsPage;
