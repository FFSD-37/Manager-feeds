import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_MANAGER_API || "http://localhost:3001";

const TAB_CONFIG = {
  user: [
    { id: "overview", label: "Overview" },
    { id: "reports", label: "Reports" },
    { id: "moderation", label: "Moderation" },
    { id: "feedback", label: "Feedback" },
    { id: "users", label: "Users" },
  ],
  kids: [
    { id: "overview", label: "Overview" },
    { id: "reports", label: "Reports" },
    { id: "moderation", label: "Moderation" },
    { id: "feedback", label: "Feedback" },
    { id: "users", label: "Kids Accounts" },
  ],
  channel: [
    { id: "overview", label: "Overview" },
    { id: "reports", label: "Reports" },
    { id: "moderation", label: "Moderation" },
    { id: "feedback", label: "Feedback" },
    { id: "channels", label: "Channels" },
  ],
  revenue: [
    { id: "overview", label: "Overview" },
    { id: "revenue", label: "Revenue" },
  ],
};

const TYPE_LABEL = {
  user: "User Manager",
  kids: "Kids Manager",
  channel: "Channel Manager",
  revenue: "Revenue Manager",
};

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

  const [overview, setOverview] = useState({
    reports: null,
    content: null,
    users: null,
    revenue: null,
  });
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportPost, setSelectedReportPost] = useState(null);
  const [reportOverlayOpen, setReportOverlayOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [payments, setPayments] = useState([]);

  const [postId, setPostId] = useState("");
  const [reason, setReason] = useState("");

  const managerType = me?.managerType || "user";

  const tabs = useMemo(() => {
    return TAB_CONFIG[managerType] || TAB_CONFIG.user;
  }, [managerType]);

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
    if (managerType === "revenue") {
      const [rev, pay] = await Promise.all([api("/home/getRevenue"), api("/payment/list")]);
      setOverview((prev) => ({
        ...prev,
        revenue: rev.rev || 0,
      }));
      setPayments(pay.payments || []);
      return;
    }

    const [r, c, u] = await Promise.all([
      api("/home/reportData"),
      api("/home/contentActivityToday"),
      api("/home/getUserCount"),
    ]);

    setOverview({
      reports: r.data || null,
      content: c.data || null,
      users: u.count || 0,
      revenue: null,
    });
  }

  async function loadReports() {
    const data = await api("/report/list");
    setReports(data.reports || []);
  }

  async function openReportOverlay(reportId) {
    setBusy(true);
    setMessage("");
    try {
      const data = await api(`/report/${reportId}/details`);
      setSelectedReport(data.report || null);
      setSelectedReportPost(data.post || null);
      setReportOverlayOpen(true);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function closeReportOverlay() {
    setReportOverlayOpen(false);
    setSelectedReport(null);
    setSelectedReportPost(null);
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

  async function loadRevenue() {
    const [rev, pay] = await Promise.all([api("/home/getRevenue"), api("/payment/list")]);
    setOverview((prev) => ({ ...prev, revenue: rev.rev || 0 }));
    setPayments(pay.payments || []);
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
      if (tabId === "revenue") await loadRevenue();
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
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [tabs, activeTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadByTab(activeTab);
  }, [activeTab, isAuthenticated, managerType]);

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
            <p>Sign in with your manager credentials to review assigned operations.</p>
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
              <span className="type-chip">{TYPE_LABEL[managerType] || "Manager"}</span>
            </div>
          </div>

          <nav className="nav-list" aria-label="Manager modules">
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
              <p>{TYPE_LABEL[managerType] || "Manager"} workspace</p>
            </div>
            <button className="refresh-btn" onClick={() => loadByTab(activeTab)} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh"}
            </button>
          </header>

          {message ? <div className="banner">{message}</div> : null}

          {activeTab === "overview" && managerType !== "revenue" && (
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
                <h3>Assigned Clients</h3>
                <p className="kpi-main">{overview.users ?? "-"}</p>
                <p>Count based on your manager type scope</p>
              </article>
            </section>
          )}

          {activeTab === "overview" && managerType === "revenue" && (
            <section className="kpi-grid two-col">
              <article className="kpi-card stagger-1">
                <h3>Total Revenue</h3>
                <p className="kpi-main">? {Number(overview.revenue || 0).toLocaleString()}</p>
                <p>Completed payments and premium transactions</p>
              </article>
              <article className="kpi-card stagger-2">
                <h3>Transactions</h3>
                <p className="kpi-main">{payments.length}</p>
                <p>Latest records available in Revenue tab</p>
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
                    <button onClick={() => openReportOverlay(r._id)} disabled={busy}>
                      View
                    </button>
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
                  <p>Type: {u.type || "Normal"}</p>
                  <p>Followers: {u.followers?.length ?? u.followers ?? 0}</p>
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
                  <p>Followers: {c.followers?.length ?? c.followers ?? 0}</p>
                </article>
              ))}
              {!channels.length ? <p className="empty">No channels found.</p> : null}
            </section>
          )}

          {activeTab === "revenue" && (
            <section className="table-wrap">
              <div className="table-head table-row revenue-row">
                <span>Payment Id</span>
                <span>User</span>
                <span>Status</span>
                <span>Amount</span>
              </div>
              {payments.map((p, idx) => (
                <div className="table-row revenue-row animated-row" style={{ animationDelay: `${idx * 35}ms` }} key={p._id}>
                  <span>{p.paymentId || p._id || "-"}</span>
                  <span>{p.username || p.user || "-"}</span>
                  <span>
                    <span className={p.status === "Completed" ? "pill done" : "pill pending"}>
                      {p.status || "Pending"}
                    </span>
                  </span>
                  <span>? {Number(p.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              {!payments.length ? <p className="empty">No payments found.</p> : null}
            </section>
          )}
        </main>
      </div>

      {reportOverlayOpen ? (
        <div className="overlay-backdrop" onClick={closeReportOverlay}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3>Report Details</h3>
              <button className="overlay-close" onClick={closeReportOverlay}>
                Close
              </button>
            </div>

            <div className="overlay-grid">
              <div>
                <p>
                  <strong>Report #:</strong> {selectedReport?.report_number || "-"}
                </p>
                <p>
                  <strong>Status:</strong> {selectedReport?.status || "-"}
                </p>
                <p>
                  <strong>Reason:</strong> {selectedReport?.reason || "No reason provided"}
                </p>
                <p>
                  <strong>Scope:</strong> {selectedReport?.scopeType || "-"}
                </p>
              </div>

              <div>
                {selectedReport?.post_id === "On account" ? (
                  <div className="overlay-empty">
                    Account-level report. No post preview is available.
                  </div>
                ) : selectedReportPost?.url ? (
                  <div className="overlay-media-wrap">
                    {selectedReportPost?.type === "Reels" ? (
                      <video src={selectedReportPost.url} controls className="overlay-media" />
                    ) : (
                      <img src={selectedReportPost.url} alt="Reported post" className="overlay-media" />
                    )}
                    <p>
                      <strong>Author:</strong> {selectedReportPost?.author || "-"}
                    </p>
                    <p>
                      <strong>Post ID:</strong> {selectedReportPost?.id || "-"}
                    </p>
                    <p>
                      <strong>Content:</strong> {selectedReportPost?.content || "-"}
                    </p>
                  </div>
                ) : (
                  <div className="overlay-empty">
                    Post preview unavailable for this report.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
