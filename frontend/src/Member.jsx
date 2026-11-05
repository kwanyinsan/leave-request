import { useEffect, useState } from 'react';

function formatDate(value) {
    return new Date(value).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Hong_Kong'
    });
}

export default function Member({ busy, setBusy, setUser, setMessage }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [leaveRequests, setLeaveRequests] = useState(null);
    const [requestsLoading, setRequestsLoading] = useState(true);

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

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage('');
        setBusy(true);

        let submitted = false;

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate,
                    reason
                })
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

            submitted = true;

            setStartDate('');
            setEndDate('');
            setReason('');

            const listResponse = await fetch('/api/requests');
            const listData = await listResponse.json();

            if (listResponse.status === 401) {
                setMessage(listData.message);
                setUser(null);
                return;
            }

            if (!listResponse.ok) {
                setMessage('Leave request submitted, but the list could not refresh. Please refresh the page.');
                return;
            }

            setLeaveRequests(listData.leaveRequests);
        } catch {
            if (submitted) {
                setMessage('Leave request submitted, but the list could not refresh. Please refresh the page.');
            } else {
                setMessage('Unable to confirm submission. Check your request list before submitting again.');
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="member-layout">
            <section className="card" aria-labelledby="request-form-title">
                <div className="card-header">
                    <h3 id="request-form-title">Submit leave request</h3>
                    <p className="text-muted">Choose your dates and provide a reason.</p>
                </div>

                <form className="card-body form-stack" onSubmit={handleSubmit}>
                    <div className="date-fields">
                        <label>
                            Start date
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                required
                            />
                        </label>

                        <label>
                            End date
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <label>
                        Reason
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={3}
                            required
                        />
                    </label>

                    <button
                        className="button button-primary"
                        type="submit"
                        disabled={busy || requestsLoading}
                    >
                        Submit
                    </button>
                </form>
            </section>

            <section className="card" aria-labelledby="member-requests-title">
                <div className="card-header">
                    <h3 id="member-requests-title">My requests</h3>
                    <p className="text-muted">Your submitted requests and their current status.</p>
                </div>

                {requestsLoading ? (
                    <p className="state-message">Loading requests...</p>
                ) : leaveRequests === null ? (
                    <p className="state-message">Request list unavailable. Please refresh the page.</p>
                ) : leaveRequests.length === 0 ? (
                    <p className="state-message">No leave requests yet.</p>
                ) : (
                    <div className="table-scroll" role="region" aria-label="My requests table" tabIndex={0}>
                        <table className="member-requests-table">
                            <thead>
                                <tr>
                                    <th scope="col" className="date-cell">Start date</th>
                                    <th scope="col" className="date-cell">End date</th>
                                    <th scope="col">Reason</th>
                                    <th scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td className="date-cell">{formatDate(request.start_date)}</td>
                                        <td className="date-cell">{formatDate(request.end_date)}</td>
                                        <td className="reason-cell">{request.reason}</td>
                                        <td>
                                            <span className={`status-badge status-${request.status}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
