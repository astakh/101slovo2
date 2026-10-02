import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

interface Report { id: number; user_id: number; user_email: string; target_sentence: string; reference_translation: string; user_translation?: string; reason: string; comment: string; status: string; admin_note?: string; created_at: string; }
interface ReportsListResponse { reports: Report[]; total: number; page: number; page_size: number; }

const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const pageSize = 20;
  const navigate = useNavigate();

  useEffect(() => { loadReports(); }, [page, statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams(); params.append("page", page.toString()); params.append("page_size", pageSize.toString());
      if (statusFilter) params.append("status", statusFilter);
      const data = await apiClient.get<ReportsListResponse>(`/admin/reports?${params.toString()}`);
      setReports(data.reports); setTotal(data.total);
    } catch (err) { setError("Не удалось загрузить жалобы"); console.error(err); }
    finally { setLoading(false); }
  };

  const handleProcess = async () => {
    if (!selectedReport) return;
    setProcessing(true);
    try { await apiClient.patch(`/admin/reports/${selectedReport.id}`, { status: "processed", admin_note: adminNote }); await loadReports(); setSelectedReport(null); setAdminNote(""); }
    catch (err) { setError("Не удалось обработать жалобу"); console.error(err); }
    finally { setProcessing(false); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="app-content py-8">
      <button onClick={() => navigate("/admin")} className="mb-4 text-indigo-600 hover:text-indigo-700">← Назад в админку</button>
      <h1 className="text-2xl font-bold mb-6">Жалобы пользователей</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Все</option><option value="new">Новые</option><option value="processed">Обработанные</option>
        </select>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
      {loading && <div className="text-center py-8"><p className="text-gray-500">Загрузка...</p></div>}
      {!loading && reports.length > 0 && (<>
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} onClick={() => { setSelectedReport(report); setAdminNote(report.admin_note || ""); }} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-500">#{report.id} • {report.user_email}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${report.status === "new" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{report.status === "new" ? "Новая" : "Обработана"}</span>
              </div>
              <p className="text-sm text-gray-700">{report.target_sentence}</p>
            </div>
          ))}
        </div>
        {totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">←</button>
          <span className="text-sm text-gray-600">{page} из {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">→</button>
        </div>}
      </>)}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">Жалоба #{selectedReport.id}</h2>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Пользователь</label><p className="text-gray-900">{selectedReport.user_email}</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Предложение</label><p className="text-gray-900 p-2 bg-gray-50 rounded">{selectedReport.target_sentence}</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Причина</label><p className="text-gray-900">{selectedReport.reason}</p></div>
              {selectedReport.status === "new" && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Заметка</label><textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} /></div>
                <button onClick={handleProcess} disabled={processing} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg">{processing ? "Обработка..." : "Обработать"}</button>
              </>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
