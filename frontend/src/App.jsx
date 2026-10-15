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
            <main>
                <p>Checking session...</p>
            </main>
        );
    }

    return (
        <main className={user && user.role === 'manager' ? 'manager-view' : ''}>
            <h1>Leave Request</h1>

            {message && <p role="status">{message}</p>}

            {user ? (
                <section>
                    <h2>{user.role === "manager" ? "Manager page" : "Member page"}</h2>

                    <p>Signed in as {user.username}</p>

                    <button type="button" onClick={handleLogout} disabled={busy}>
                        Logout
                    </button>

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
                <section>
                    <h2>Login or register</h2>

                    <form
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

                        <button type="submit" disabled={busy}>
                            Login
                        </button>

                        <button
                            type="button"
                            onClick={() => handleAuth("register")}
                            disabled={busy}
                        >
                            Register
                        </button>
                    </form>

                    <p>Registration creates a member account. Log in afterward.</p>
                </section>
            )}
        </main>
    );
}