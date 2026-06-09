import { useEffect, useState } from "react";
import { Shield, Users, UserX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchUsers,
  fetchRoles,
  updateUser,
  deactivateUser,
  assignUserRoles,
  type AdminUser,
  type AdminRole,
} from "../lib/hospital-api";

export function SettingsPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"users" | "roles">("users");

  const isAdmin = currentUser?.permissions?.includes("users:manage");

  const load = () => {
    if (!token || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchUsers(token), fetchRoles(token)])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r);
        setError("");
      })
      .catch((e: Error) => {
        setError(e.message);
        setUsers([]);
        setRoles([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, isAdmin]);

  const handleSaveRoles = async () => {
    if (!token || !editingUser) return;
    await assignUserRoles(token, editingUser.id, selectedRoleIds);
    setEditingUser(null);
    load();
  };

  const handleToggleActive = async (u: AdminUser) => {
    if (!token) return;
    if (u.isActive) {
      await deactivateUser(token, u.id);
    } else {
      await updateUser(token, u.id, { isActive: true });
    }
    load();
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Settings</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">Cài đặt hệ thống</h1>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <Shield size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Bạn không có quyền quản lý người dùng.</p>
          <p className="text-sm text-gray-400 mt-2">Liên hệ quản trị viên để được cấp quyền.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">HMS / Settings</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Cài đặt hệ thống</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý người dùng và phân quyền</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "users" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users size={16} className="inline mr-2" />
          Người dùng
        </button>
        <button
          onClick={() => setTab("roles")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "roles" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Shield size={16} className="inline mr-2" />
          Vai trò
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-400">Đang tải...</div>
      ) : tab === "users" ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Họ tên</th>
                <th className="px-5 py-3">Vai trò</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 text-gray-700">{u.email}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">
                      {u.lastName} {u.firstName}
                    </p>
                    {u.title && <p className="text-xs text-gray-400">{u.title}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.isActive ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setSelectedRoleIds(u.roles.map((r) => r.id));
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Phân quyền
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="text-xs text-red-500 hover:underline flex items-center gap-1"
                        >
                          <UserX size={12} />
                          {u.isActive ? "Vô hiệu" : "Kích hoạt"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{role.name}</h3>
                <span className="text-xs text-gray-400">{role._count.users} người dùng</span>
              </div>
              {role.description && <p className="text-sm text-gray-500 mb-3">{role.description}</p>}
              <div className="flex flex-wrap gap-1">
                {role.permissions.map((rp) => (
                  <span key={rp.permission.id} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {rp.permission.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Phân quyền: {editingUser.email}</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds([...selectedRoleIds, role.id]);
                      } else {
                        setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="font-medium">{role.name}</span>
                  <span className="text-gray-400 text-xs">{role.description}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-gray-600">
                Hủy
              </button>
              <button onClick={handleSaveRoles} className="px-4 py-2 text-sm bg-primary text-white rounded-lg">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
