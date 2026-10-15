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
        } catch {
            if (deleted) {
                setMessage('Member deleted, but the member list could not refresh. Please refresh the page.');
            } else {
                setMessage('Unable to confirm deletion. Please refresh the page to check the member status.');
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <section>
            <h3>All leave requests</h3>

            {requestsLoading ? (
                <p>Loading requests...</p>
            ) : leaveRequests === null ? (
                <p>Request list unavailable. Please refresh the page.</p>
            ) : leaveRequests.length === 0 ? (
                <p>No leave requests yet.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Start date</th>
                            <th>End date</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Change status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaveRequests.map((request) => (
                            <tr key={request.id}>
                                <td>{request.username}</td>
                                <td>{formatDate(request.start_date)}</td>
                                <td>{formatDate(request.end_date)}</td>
                                <td>{request.reason}</td>
                                <td>{request.status}</td>
                                <td>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange(request.id, 'approved')}
                                        disabled={busy}
                                    >
                                        Approve
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange(request.id, 'rejected')}
                                        disabled={busy}
                                    >
                                        Reject
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange(request.id, 'pending')}
                                        disabled={busy}
                                    >
                                        Set pending
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <h3>Members</h3>

            {membersLoading ? (
                <p>Loading members...</p>
            ) : members === null ? (
                <p>Member list unavailable. Please refresh the page.</p>
            ) : members.length === 0 ? (
                <p>No member accounts yet.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Member ID</th>
                            <th>Username</th>
                            <th>Account status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => (
                            <tr key={member.id}>
                                <td>{member.id}</td>
                                <td>{member.username}</td>
                                <td>
                                    {member.is_deleted ? 'Deleted' : 'Active'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <h3>Delete member</h3>

            <p>
                Deleting a member disables their account and preserves
                their leave requests.
            </p>

            <form onSubmit={handleDelete}>
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
                    type="submit"
                    disabled={busy || membersLoading}
                >
                    Delete
                </button>
            </form>
        </section>
    );
}