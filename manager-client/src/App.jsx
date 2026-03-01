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
  const [searchQuery, setSearchQuery] = useState("");

  // User detail management
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailOverlayOpen, setUserDetailOverlayOpen] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [userReports, setUserReports] = useState({ reportedByUser: [], reportsAgainstUser: [] });
  const [userDetailTab, setUserDetailTab] = useState("profile");
  const [userWarnReason, setUserWarnReason] = useState("");
  const [userBanReason, setUserBanReason] = useState("");

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
// and push
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

  async function openUserDetails(user) {
    setBusy(true);
    setMessage("");
    try {
      setSelectedUser(user);
      const [postsData, reportsData] = await Promise.all([
        api(`/moderation/user/${user.username}/posts`),
        api(`/moderation/user/${user.username}/reports`),
      ]);
      setUserPosts(postsData.posts || []);
      setUserReports(reportsData || { reportedByUser: [], reportsAgainstUser: [] });
      setUserDetailTab("profile");
      setUserDetailOverlayOpen(true);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function closeUserDetailsOverlay() {
    setUserDetailOverlayOpen(false);
    setSelectedUser(null);
    setUserPosts([]);
    setUserReports({ reportedByUser: [], reportsAgainstUser: [] });
    setUserWarnReason("");
    setUserBanReason("");
  }

  async function handleWarnUser() {
    if (!selectedUser || !userWarnReason.trim()) {
      setMessage("Please provide a reason for warning");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api(`/moderation/user/${selectedUser.username}/warn`, {
        method: "POST",
        body: JSON.stringify({ reason: userWarnReason }),
      });
      setMessage(`User ${selectedUser.username} has been warned.`);
      setUserWarnReason("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBanUser() {
    if (!selectedUser || !userBanReason.trim()) {
      setMessage("Please provide a reason for banning");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api(`/moderation/user/${selectedUser.username}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason: userBanReason }),
      });
      setMessage(`User ${selectedUser.username} has been banned.`);
      setUserBanReason("");
      await loadUsers();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveUserPost(post) {
    if (!window.confirm(`Remove this post by ${selectedUser.username}?`)) return;
    setBusy(true);
    try {
      await api(`/moderation/post/${post._id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: "Removed by manager review" }),
      });
      setMessage("Post removed successfully.");
      // Refresh user posts
      const postsData = await api(`/moderation/user/${selectedUser.username}/posts`);
      setUserPosts(postsData.posts || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

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
            <section className="users-management">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search by username, email, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <span className="result-count">{filteredUsers.length} users found</span>
              </div>
              <div className="cards-list">
                {filteredUsers.map((u, idx) => (
                  <article
                    className="info-card user-card animated-row"
                    style={{ animationDelay: `${idx * 35}ms` }}
                    key={u._id}
                    onClick={() => openUserDetails(u)}
                  >
                    <div className="user-card-header">
                      <div className="user-avatar">{String(u.username || "U").charAt(0).toUpperCase()}</div>
                      <div className="user-info-main">
                        <strong>{u.username || u.name || "Unnamed"}</strong>
                        <p className="user-email">{u.email || "No email"}</p>
                      </div>
                    </div>
                    <div className="user-card-meta">
                      <span className="badge">{u.type || "Normal"}</span>
                      <span className="user-stat">👥 {u.followers?.length ?? 0} followers</span>
                      <span className="user-stat">🔒 {u.visibility || "Public"}</span>
                    </div>
                    {u.isPremium && <span className="premium-badge">★ Premium</span>}
                  </article>
                ))}
                {!filteredUsers.length ? <p className="empty">No users found.</p> : null}
              </div>
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

      {userDetailOverlayOpen ? (
        <div className="overlay-backdrop" onClick={closeUserDetailsOverlay}>
          <div className="overlay-card user-detail-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <div className="user-detail-header">
                <div className="user-detail-avatar">{String(selectedUser?.username || "U").charAt(0).toUpperCase()}</div>
                <div>
                  <h3>{selectedUser?.username || "User"}</h3>
                  <p className="user-detail-subtitle">{selectedUser?.email || "No email"}</p>
                </div>
              </div>
              <button className="overlay-close" onClick={closeUserDetailsOverlay}>
                Close
              </button>
            </div>

            <div className="user-detail-tabs">
              {["profile", "posts", "reports", "actions"].map((tab) => (
                <button
                  key={tab}
                  className={userDetailTab === tab ? "detail-tab active" : "detail-tab"}
                  onClick={() => setUserDetailTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {userDetailTab === "profile" && (
              <div className="user-detail-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Full Name</label>
                    <p>{selectedUser?.fullName || "-"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{selectedUser?.email || "-"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Phone</label>
                    <p>{selectedUser?.phone || "-"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Type</label>
                    <p>{selectedUser?.type || "Normal"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Gender</label>
                    <p>{selectedUser?.gender || "-"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Visibility</label>
                    <p>{selectedUser?.visibility || "Public"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Followers</label>
                    <p>{selectedUser?.followers?.length ?? 0}</p>
                  </div>
                  <div className="detail-item">
                    <label>Following</label>
                    <p>{selectedUser?.followings?.length ?? 0}</p>
                  </div>
                  <div className="detail-item">
                    <label>Premium</label>
                    <p>{selectedUser?.isPremium ? "Yes ✓" : "No"}</p>
                  </div>
                  <div className="detail-item">
                    <label>Coins</label>
                    <p>{selectedUser?.coins ?? 0}</p>
                  </div>
                </div>
                {selectedUser?.bio && (
                  <div className="detail-section">
                    <label>Bio</label>
                    <p className="bio-text">{selectedUser.bio}</p>
                  </div>
                )}
              </div>
            )}

            {userDetailTab === "posts" && (
              <div className="user-detail-content">
                <div className="posts-list">
                  {userPosts.length > 0 ? (
                    userPosts.map((post) => (
                      <div key={post._id || post.id} className="post-item">
                        <div className="post-header">
                          <span className="post-type">{post.type || "Post"}</span>
                          <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="post-content">{post.content?.substring(0, 150) || "-"}...</p>
                        <div className="post-stats">
                          <span>👍 {post.likes || 0}</span>
                          <span>💬 {post.comments?.length || 0}</span>
                          {post.isArchived && <span className="pill pending">Archived</span>}
                        </div>
                        {post.url && (
                          <div className="post-preview">
                            {post.type === "Reels" ? (
                              <video src={post.url} className="post-media" />
                            ) : (
                              <img src={post.url} alt="Post" className="post-media" />
                            )}
                          </div>
                        )}
                        <button
                          className="remove-post-btn"
                          onClick={() => handleRemoveUserPost(post)}
                          disabled={busy}
                        >
                          Remove Post
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="empty">No posts found.</p>
                  )}
                </div>
              </div>
            )}

            {userDetailTab === "reports" && (
              <div className="user-detail-content">
                <div className="reports-section">
                  <h4>Reports Against This User ({userReports.reportsAgainstUser?.length || 0})</h4>
                  {userReports.reportsAgainstUser?.length > 0 ? (
                    <div className="reports-list">
                      {userReports.reportsAgainstUser.map((report) => (
                        <div key={report._id} className="report-item">
                          <p><strong>Reason:</strong> {report.reason || "Not specified"}</p>
                          <p><strong>Reporter:</strong> {report.reporter || "Anonymous"}</p>
                          <p><strong>Status:</strong> <span className={report.status === "Resolved" ? "pill done" : "pill pending"}>{report.status || "Pending"}</span></p>
                          <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">No reports against this user.</p>
                  )}
                </div>

                <div className="reports-section">
                  <h4>Reports Made By This User ({userReports.reportedByUser?.length || 0})</h4>
                  {userReports.reportedByUser?.length > 0 ? (
                    <div className="reports-list">
                      {userReports.reportedByUser.map((report) => (
                        <div key={report._id} className="report-item">
                          <p><strong>Target:</strong> {report.user_reported || "Not specified"}</p>
                          <p><strong>Reason:</strong> {report.reason || "Not specified"}</p>
                          <p><strong>Status:</strong> <span className={report.status === "Resolved" ? "pill done" : "pill pending"}>{report.status || "Pending"}</span></p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">This user has not filed any reports.</p>
                  )}
                </div>
              </div>
            )}

            {userDetailTab === "actions" && (
              <div className="user-detail-content">
                <div className="action-section">
                  <h4>Warn User</h4>
                  <div className="action-form">
                    <textarea
                      placeholder="Reason for warning..."
                      value={userWarnReason}
                     onChange={(e) => setUserWarnReason(e.target.value)}
                      className="action-textarea"
                    />
                    <button onClick={handleWarnUser} disabled={busy} className="action-btn warn-btn">
                      {busy ? "Processing..." : "Issue Warning"}
                    </button>
                  </div>
                </div>

                <div className="action-section danger">
                  <h4>Ban User</h4>
                  <p className="danger-text">⚠️ This action will suspend the user account.</p>
                  <div className="action-form">
                    <textarea
                      placeholder="Reason for banning..."
                      value={userBanReason}
                      onChange={(e) => setUserBanReason(e.target.value)}
                      className="action-textarea"
                    />
                    <button onClick={handleBanUser} disabled={busy} className="action-btn ban-btn">
                      {busy ? "Processing..." : "Ban User"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
