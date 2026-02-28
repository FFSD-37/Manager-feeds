import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_MANAGER_API || "http://localhost:3001";

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [overview, setOverview] = useState({ reports: null, content: null, users: null });
  const [reports, setReports] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);

  const [postId, setPostId] = useState("");
  const [reason, setReason] = useState("");

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "reports", label: "Reports" },
      { id: "moderation", label: "Moderation" },
      { id: "feedback", label: "Feedback" },
      { id: "users", label: "Users" },
      { id: "channels", label: "Channels" },
    ],
    []
  );

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  }

  async function checkAuth() {
    try {
      const data = await api("/auth/status");
      setIsAuthenticated(Boolean(data?.isAuthenticated));
      setMe(data?.user || null);
    } catch {
      setIsAuthenticated(false);
      setMe(null);
    } finally {
      setAuthChecked(true);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await checkAuth();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setMessage("");
    try {
      await api("/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setMe(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadOverview() {
    const [r, c, u] = await Promise.all([
      api("/home/reportData"),
      api("/home/contentActivityToday"),
      api("/home/getUserCount"),
    ]);

    setOverview({
      reports: r.data || null,
      content: c.data || null,
      users: u.count || 0,
    });
  }

  async function loadReports() {
    const data = await api("/report/list");
    setReports(data.reports || []);
  }

  async function updateReport(reportId, status) {
    setBusy(true);
    setMessage("");
    try {
      await api("/report/updateReportStatus", {
        method: "POST",
        body: JSON.stringify({ reportId, status }),
      });
      setMessage("Report updated successfully.");
      await loadReports();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadFeedbacks() {
    const data = await api("/feedback/list");
    setFeedbacks(data.feedbacks || []);
  }

  async function loadUsers() {
    const data = await api("/user/list");
    setUsers(data.data || []);
  }

  async function loadChannels() {
    const data = await api("/channel/list");
    setChannels(data.allchannels || []);
  }

  async function handleRemovePost(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api(`/moderation/post/${postId.trim()}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
      setMessage("Post removed by manager.");
      setPostId("");
      setReason("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadByTab(tabId) {
    setBusy(true);
    setMessage("");
    try {
      if (tabId === "overview") await loadOverview();
      if (tabId === "reports") await loadReports();
      if (tabId === "feedback") await loadFeedbacks();
      if (tabId === "users") await loadUsers();
      if (tabId === "channels") await loadChannels();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadByTab(activeTab);
  }, [activeTab, isAuthenticated]);

  if (!authChecked) {
    return <div className="loading-screen">Checking manager session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-shell">
        <div className="auth-orb auth-orb-a" />
        <div className="auth-orb auth-orb-b" />
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="auth-title-wrap">
            <p className="eyebrow">Feeds Platform</p>
            <h1>Manager Control Desk</h1>
            <p>Sign in with your manager credentials to review reports and moderate content.</p>
          </div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign In"}
          </button>
          {loginError ? <div className="error-text">{loginError}</div> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard-bg">
      <div className="dashboard-grid">
        <aside className="sidebar">
          <div className="brand">
            <p className="eyebrow">Manager Portal</p>
            <h2>Operational Hub</h2>
          </div>

          <div className="profile-box">
            <div className="avatar">{String(me?.username || "M").charAt(0).toUpperCase()}</div>
            <div>
              <strong>{me?.username || "Manager"}</strong>
              <p>{me?.email || "No email"}</p>
            </div>
          </div>

          <nav className="nav-list">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "nav-btn active" : "nav-btn"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button className="logout-btn" onClick={handleLogout} disabled={busy}>
            Logout
          </button>
        </aside>

        <main className="panel">
          <header className="panel-header">
            <div>
              <h1>{tabs.find((t) => t.id === activeTab)?.label || "Dashboard"}</h1>
              <p>Manager-level moderation workspace</p>
            </div>
            <button className="refresh-btn" onClick={() => loadByTab(activeTab)} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh"}
            </button>
          </header>

          {message ? <div className="banner">{message}</div> : null}

          {activeTab === "overview" && (
            <section className="kpi-grid">
              <article className="kpi-card stagger-1">
                <h3>Report Queue</h3>
                <p className="kpi-main">{overview.reports?.total ?? "-"}</p>
                <p>Pending: {overview.reports?.pending ?? "-"}</p>
                <p>Resolved Today: {overview.reports?.resolvedToday ?? "-"}</p>
              </article>
              <article className="kpi-card stagger-2">
                <h3>Content Activity</h3>
                <p>Posts: {overview.content?.postsToday ?? "-"}</p>
                <p>Reels: {overview.content?.reelsToday ?? "-"}</p>
                <p>Stories: {overview.content?.storiesToday ?? "-"}</p>
              </article>
              <article className="kpi-card stagger-3">
                <h3>Total Clients</h3>
                <p className="kpi-main">{overview.users ?? "-"}</p>
                <p>Users + Channels tracked in feed system</p>
              </article>
            </section>
          )}

          {activeTab === "reports" && (
            <section className="table-wrap">
              <div className="table-head table-row">
                <span>Report</span>
                <span>Reported User</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {reports.map((r, idx) => (
                <div className="table-row animated-row" style={{ animationDelay: `${idx * 35}ms` }} key={r._id}>
                  <span>#{r.report_number || "-"}</span>
                  <span>{r.user_reported || "-"}</span>
                  <span>
                    <span className={r.status === "Resolved" ? "pill done" : "pill pending"}>
                      {r.status || "Pending"}
                    </span>
                  </span>
                  <span className="btn-row">
                    <button onClick={() => updateReport(r._id, "Pending")} disabled={busy}>
                      Mark Pending
                    </button>
                    <button onClick={() => updateReport(r._id, "Resolved")} disabled={busy}>
                      Resolve
                    </button>
                  </span>
                </div>
              ))}
              {!reports.length ? <p className="empty">No reports found.</p> : null}
            </section>
          )}

          {activeTab === "moderation" && (
            <section className="moderation-card">
              <h3>Delete Inappropriate Post</h3>
              <p>Use Mongo post ID and document reason for moderation audit context.</p>
              <form className="mod-form" onSubmit={handleRemovePost}>
                <input
                  type="text"
                  placeholder="Post _id"
                  value={postId}
                  onChange={(e) => setPostId(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <button type="submit" disabled={busy}>
                  {busy ? "Removing..." : "Remove Post"}
                </button>
              </form>
            </section>
          )}

          {activeTab === "feedback" && (
            <section className="cards-list">
              {feedbacks.map((f, idx) => (
                <article className="info-card animated-row" style={{ animationDelay: `${idx * 35}ms` }} key={f._id}>
                  <strong>{f.username || f.user || "Unknown"}</strong>
                  <p>{f.feedback || f.message || "No text"}</p>
                </article>
              ))}
              {!feedbacks.length ? <p className="empty">No feedback found.</p> : null}
            </section>
          )}

          {activeTab === "users" && (
            <section className="cards-list">
              {users.map((u, idx) => (
                <article className="info-card animated-row" style={{ animationDelay: `${idx * 35}ms` }} key={u._id}>
                  <strong>{u.username || u.name || "Unnamed"}</strong>
                  <p>{u.email || "No email"}</p>
                  <p>Followers: {u.followers ?? 0}</p>
                </article>
              ))}
              {!users.length ? <p className="empty">No users found.</p> : null}
            </section>
          )}

          {activeTab === "channels" && (
            <section className="cards-list">
              {channels.map((c, idx) => (
                <article className="info-card animated-row" style={{ animationDelay: `${idx * 35}ms` }} key={c._id}>
                  <strong>{c.channelName || c.username || c.name || "Unnamed channel"}</strong>
                  <p>{c.email || "No email"}</p>
                  <p>Followers: {c.followers ?? 0}</p>
                </article>
              ))}
              {!channels.length ? <p className="empty">No channels found.</p> : null}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
