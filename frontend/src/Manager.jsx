import { useEffect, useState } from 'react';

function formatDate(value) {
    return new Date(value).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Hong_Kong'
    });
}

export default function Manager({ busy, setBusy, setUser, setMessage }) {
    const [leaveRequests, setLeaveRequests] = useState(null);
    const [members, setMembers] = useState(null);
    const [memberId, setMemberId] = useState('');
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        async function loadRequests() {
            try {
                const response = await fetch('/api/requests');
                const data = await response.json();

                if (ignore) {
                    return;
                }

                if (response.status === 401) {
                    setMessage(data.message);
                    setUser(null);
                    return;
                }

                if (!response.ok) {
                    setMessage(data.message);
                    return;
                }

                setLeaveRequests(data.leaveRequests);
            } catch {
                if (!ignore) {
                    setMessage('Unable to load leave requests. Please refresh to try again.');
                }
            } finally {
                if (!ignore) {
                    setRequestsLoading(false);
                }
            }
        }

        loadRequests();

        return () => {
            ignore = true;
        };
    }, [setUser, setMessage]);

    useEffect(() => {
        let ignore = false;

        async function loadMembers() {
            try {
                const response = await fetch('/api/members');
                const data = await response.json();

                if (ignore) {
                    return;
                }

                if (response.status === 401) {
                    setMessage(data.message);
                    setUser(null);
                    return;
                }

                if (!response.ok) {
                    setMessage(data.message);
                    return;
                }

                setMembers(data.members);
            } catch {
                if (!ignore) {
                    setMessage('Unable to load members. Please refresh to try again.');
                }
            } finally {
                if (!ignore) {
                    setMembersLoading(false);
                }
            }
        }

        loadMembers();

        return () => {
            ignore = true;
        };
    }, [setUser, setMessage]);

    async function handleStatusChange(requestId, status) {
        setMessage('');
        setBusy(true);

        let updated = false;

        try {
            const response = await fetch(`/api/approve/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (response.status === 401) {
                setMessage(data.message);
                setUser(null);
                return;
            }

            setMessage(data.message);

            if (!response.ok) {
                return;
            }

            updated = true;

            const listResponse = await fetch('/api/requests');
            const listData = await listResponse.json();

            if (listResponse.status === 401) {
                setMessage(listData.message);
                setUser(null);
                return;
            }

            if (!listResponse.ok) {
                setMessage('Status updated, but the request list could not refresh. Please refresh the page.');
                return;
            }

            setLeaveRequests(listData.leaveRequests);
        } catch {
            if (updated) {
                setMessage('Status updated, but the request list could not refresh. Please refresh the page.');
            } else {
                setMessage('Unable to confirm the status change. Please refresh the page to check.');
            }
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(event) {
        event.preventDefault();
        setMessage('');

        const id = Number(memberId);

        if (!Number.isInteger(id) || id <= 0) {
            setMessage('Member ID must be a positive integer.');
            return;
        }

        setBusy(true);

        let deleted = false;

        try {
            const response = await fetch(`/api/delete/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.status === 401) {
                setMessage(data.message);
                setUser(null);
                return;
            }

            setMessage(data.message);

            if (!response.ok) {
                return;
            }

            deleted = true;
            setMemberId('');

            const listResponse = await fetch('/api/members');
            const listData = await listResponse.json();

            if (listResponse.status === 401) {
                setMessage(listData.message);
                setUser(null);
                return;
            }

            if (!listResponse.ok) {
                setMessage('Member deleted, but the member list could not refresh. Please refresh the page.');
                return;
            }

            setMembers(listData.members);

            const requestsResponse = await fetch('/api/requests');
            const requestsData = await requestsResponse.json();

            if (requestsResponse.status === 401) {
                setMessage(requestsData.message);
                setUser(null);
                return;
            }

            if (!requestsResponse.ok) {
                setMessage('Member deleted, but the request list could not refresh. Please refresh the page.');
                return;
            }

            setLeaveRequests(requestsData.leaveRequests);
        } catch {
            if (deleted) {
                setMessage('Member deleted, but the list could not refresh. Please refresh the page.');
            } else {
                setMessage('Unable to confirm deletion. Please refresh the page to check the member status.');
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="manager-layout">
            <section className="card" aria-labelledby="manager-requests-title">
                <div className="card-header">
                    <h3 id="manager-requests-title">All leave requests</h3>
                    <p className="text-muted">Review requests and update their status.</p>
                </div>

                {requestsLoading ? (
                    <p className="state-message">Loading requests...</p>
                ) : leaveRequests === null ? (
                    <p className="state-message">Request list unavailable. Please refresh the page.</p>
                ) : leaveRequests.length === 0 ? (
                    <p className="state-message">No leave requests yet.</p>
                ) : (
                    <div className="table-scroll" role="region" aria-label="All leave requests table" tabIndex={0}>
                        <table className="manager-requests-table">
                            <thead>
                                <tr>
                                    <th scope="col">Applicant</th>
                                    <th scope="col" className="date-cell">Start date</th>
                                    <th scope="col" className="date-cell">End date</th>
                                    <th scope="col">Reason</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Change status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td className="applicant-cell">{request.username}</td>
                                        <td className="date-cell">{formatDate(request.start_date)}</td>
                                        <td className="date-cell">{formatDate(request.end_date)}</td>
                                        <td className="reason-cell">{request.reason}</td>
                                        <td>
                                            <span className={`status-badge status-${request.status}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="action-cell">
                                            {request.user_is_deleted ? (
                                                <span className="text-muted">User account deleted</span>
                                            ) : (
                                                <div className="request-actions">
                                                    <button
                                                        className="button button-primary button-small"
                                                        type="button"
                                                        onClick={() => handleStatusChange(request.id, 'approved')}
                                                        disabled={busy}
                                                    >
                                                        Approve
                                                    </button>

                                                    <button
                                                        className="button button-danger-outline button-small"
                                                        type="button"
                                                        onClick={() => handleStatusChange(request.id, 'rejected')}
                                                        disabled={busy}
                                                    >
                                                        Reject
                                                    </button>

                                                    <button
                                                        className="button button-secondary button-small"
                                                        type="button"
                                                        onClick={() => handleStatusChange(request.id, 'pending')}
                                                        disabled={busy}
                                                    >
                                                        Set pending
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="manager-secondary-grid">
                <section className="card" aria-labelledby="members-title">
                    <div className="card-header">
                        <h3 id="members-title">Members</h3>
                        <p className="text-muted">Member accounts and their current account status.</p>
                    </div>

                    {membersLoading ? (
                        <p className="state-message">Loading members...</p>
                    ) : members === null ? (
                        <p className="state-message">Member list unavailable. Please refresh the page.</p>
                    ) : members.length === 0 ? (
                        <p className="state-message">No member accounts yet.</p>
                    ) : (
                        <div className="table-scroll" role="region" aria-label="Members table" tabIndex={0}>
                            <table className="members-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Member ID</th>
                                        <th scope="col">Username</th>
                                        <th scope="col">Account status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member) => (
                                        <tr key={member.id}>
                                            <td className="id-cell">{member.id}</td>
                                            <td className="applicant-cell">{member.username}</td>
                                            <td>
                                                <span className={`status-badge ${member.is_deleted ? 'status-deleted' : 'status-approved'}`}>
                                                    {member.is_deleted ? 'Deleted' : 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="card" aria-labelledby="delete-member-title">
                    <div className="card-header">
                        <h3 id="delete-member-title">Delete member</h3>
                        <p className="text-muted">
                            Deleting a member disables their account and preserves
                            their leave requests.
                        </p>
                    </div>

                    <form className="card-body form-stack" onSubmit={handleDelete}>
                        <label>
                            Member ID
                            <input
                                type="text"
                                value={memberId}
                                onChange={(event) => setMemberId(event.target.value)}
                                disabled={busy}
                                required
                            />
                        </label>

                        <button
                            className="button button-danger"
                            type="submit"
                            disabled={busy || membersLoading}
                        >
                            Delete
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
