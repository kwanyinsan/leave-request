import Member from './Member';
import Manager from './Manager';
import { useEffect, useState } from "react";

export default function App() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let ignore = false;

        async function loadCurrentUser() {
            try {
                const response = await fetch("/api/current");
                const data = await response.json();

                if (ignore) {
                    return;
                }

                if (response.ok) {
                    setUser(data.user);
                } else if (response.status !== 401) {
                    setMessage(data.message);
                }
            } catch {
                if (!ignore) {
                    setMessage(
                        "Unable to check your session. Please refresh to try again.",
                    );
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadCurrentUser();

        return () => {
            ignore = true;
        };
    }, []);

    async function handleAuth(action) {
        setMessage("");
        setBusy(true);

        try {
            const response = await fetch(`/api/${action}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await response.json();

            setMessage(data.message);

            if (response.ok) {
                if (action === "login") {
                    setPassword("");
                    setUser(data.user);
                } else if (action === "register") {
                    setPassword("");
                }
            }
        } catch {
            setMessage("Unable to complete the request. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    async function handleLogout() {
        setMessage("");
        setBusy(true);

        try {
            const response = await fetch("/api/logout", {
                method: "POST",
            });

            const data = await response.json();

            setMessage(data.message);

            if (response.ok) {
                setUser(null);
                setUsername("");
                setPassword("");
            }
        } catch {
            setMessage("Unable to complete logout. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <main className="session-screen">
                <div className="card session-card" role="status">
                    <span className="brand-mark" aria-hidden="true">LR</span>
                    <h1>Leave Request</h1>
                    <p className="text-muted">Checking session...</p>
                </div>
            </main>
        );
    }

    return (
        <main className={user ? `app-shell ${user.role === 'manager' ? 'manager-view' : 'member-view'}` : 'app-shell auth-shell'}>
            <header className="app-header">
                <div className="app-header-inner">
                    <div className="brand">
                        <span className="brand-mark" aria-hidden="true">LR</span>
                        <h1>Leave Request</h1>
                    </div>
                    {user && (
                        <div className="account-tools">
                            <p className="account-summary">
                                <span>Signed in as</span>
                                <strong>{user.username}</strong>
                            </p>
                            <span className="role-badge">
                                {user.role === 'manager' ? 'Manager' : 'Member'}
                            </span>
                            <button className="button button-secondary" type="button" onClick={handleLogout} disabled={busy}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="page-content">
                {message && <p className="feedback" role="status">{message}</p>}

                {user ? (
                    <section aria-labelledby="page-title">
                        <div className="page-heading">
                            <h2 id="page-title">{user.role === "manager" ? "Manager page" : "Member page"}</h2>
                            <p className="text-muted">
                                {user.role === 'manager'
                                    ? 'Review leave requests and manage member accounts.'
                                    : 'Submit a leave request and follow its status.'}
                            </p>
                        </div>

                        {user.role === 'member' && (
                            <Member
                                busy={busy}
                                setBusy={setBusy}
                                setUser={setUser}
                                setMessage={setMessage}
                            />
                        )}

                        {user.role === 'manager' && (
                            <Manager
                                busy={busy}
                                setBusy={setBusy}
                                setUser={setUser}
                                setMessage={setMessage}
                            />
                        )}
                    </section>
                ) : (
                    <section className="card auth-card" aria-labelledby="auth-title">
                        <div className="card-header">
                            <h2 id="auth-title">Login or register</h2>
                            <p className="text-muted">Access your Leave Request account.</p>
                        </div>
                        <div className="card-body">
                            <form
                                className="form-stack"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    handleAuth("login");
                                }}
                            >
                                <label>
                                    Username
                                    <input
                                        type="text"
                                        name="username"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                    />
                                </label>

                                <label>
                                    Password
                                    <input
                                        type="password"
                                        name="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                    />
                                </label>

                                <div className="auth-actions">
                                    <button className="button button-primary" type="submit" disabled={busy}>
                                        Login
                                    </button>
                                    <button
                                        className="button button-secondary"
                                        type="button"
                                        onClick={() => handleAuth("register")}
                                        disabled={busy}
                                    >
                                        Register
                                    </button>
                                </div>
                            </form>
                            <p className="form-help">Registration creates a member account. Log in afterward.</p>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
