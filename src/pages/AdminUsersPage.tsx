import React, { useEffect, useState } from "react";
import apiClient from "../api/client";

interface User { id: number; email: string; is_onboarded: boolean; is_admin: boolean; created_at: string; }
interface UsersListResponse { users: User[]; total: number; page: number; page_size: number; }

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => { loadUsers(); }, [page, search]);

  const loadUsers = async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams(); params.append("page", page.toString()); params.append("page_size", pageSize.toString());
      if (search.trim()) params.append("search", search.trim());
      const data = await apiClient.get<UsersListResponse>(`/admin/users?${params.toString()}`);
      setUsers(data.users); setTotal(data.total);
    } catch (err) { setError("Не удалось загрузить пользователей"); console.error(err); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm("Сбросить пароль этому пользователю?")) return;
    setResettingUserId(userId);
    try {
      const response = await apiClient.post<{ temporary_password: string }>(`/admin/users/${userId}/reset-password`);
      setTempPassword(response.temporary_password);
    } catch (err: any) { console.error(err); }
    finally { setResettingUserId(null); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="app-content py-8">
      <h1 className="text-2xl font-bold mb-6">Пользователи</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <input type="text" placeholder="Поиск по email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      {tempPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Пароль сброшен</h2>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4"><p className="text-sm font-mono text-gray-900 break-all">{tempPassword}</p></div>
            <button onClick={() => { navigator.clipboard.writeText(tempPassword); setTempPassword(null); }} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Скопировать и закрыть</button>
          </div>
        </div>
      )}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}
      {loading && <div className="text-center py-8"><p className="text-gray-500">Загрузка...</p></div>}
      {!loading && users.length > 0 && (<>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{user.email}</span>
                    {user.is_admin && <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">Админ</span>}
                  </div>
                  <div className="text-sm text-gray-500">ID: {user.id}</div>
                </div>
                <button onClick={() => handleResetPassword(user.id)} disabled={resettingUserId === user.id} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded disabled:opacity-50">
                  {resettingUserId === user.id ? "Сброс..." : "Сбросить пароль"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">←</button>
          <span className="text-sm text-gray-600">{page} из {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">→</button>
        </div>}
      </>)}
    </div>
  );
};

export default AdminUsersPage;
