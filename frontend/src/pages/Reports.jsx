import React, { useState, useEffect } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { formatRupees, formatDate, getCategoryColor } from '../utils/format.js';
import { PieChart as PieChartIcon, Calendar, TrendingUp, Download, Printer } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function Reports() {
  const { activeGroup } = useGroup();
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeGroup?._id) return;
    let isMounted = true;
    setLoading(true);

    api.getReports(activeGroup._id, period)
      .then((data) => {
        if (isMounted) setReportData(data);
      })
      .catch((err) => console.error('Error fetching reports:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeGroup?._id, period]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please log in to view reports.</p>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to view reports.</p>
      </div>
    );
  }

  const categoryBreakdown = reportData?.categoryBreakdown || [];
  const chartData = categoryBreakdown.map((item) => ({
    name: item.category,
    value: item.total / 100, // converted to rupees for chart value
    rawPaise: item.total
  }));

  const totalPaise = reportData?.totalSpend || 0;

  const handleExportCSV = () => {
    if (!reportData?.expenses || reportData.expenses.length === 0) {
      alert('No expense data available to export');
      return;
    }

    const sanitizeCsvField = (val) => {
      let str = String(val || '').replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = ['Date', 'Title', 'Category', 'Paid By', 'Amount (INR)', 'Notes'];
    const rows = reportData.expenses.map((e) => [
      new Date(e.date).toISOString().split('T')[0],
      sanitizeCsvField(e.title),
      sanitizeCsvField(e.category || 'Other'),
      sanitizeCsvField(e.payerNames),
      (e.amount / 100).toFixed(2),
      sanitizeCsvField(e.notes)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeGroup.name.toLowerCase().replace(/\s+/g, '-')}-report-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Period Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={22} color="var(--primary)" /> Expense reports
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Category distribution and period analysis
          </span>
        </div>

        {/* Period tabs & Export actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                id={`report-tab-${p}`}
                onClick={() => setPeriod(p)}
                className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize', padding: '6px 14px', border: 'none' }}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="btn btn-secondary btn-sm"
            title="Download CSV spreadsheet"
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            title="Print or save as PDF"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Total spend
          </span>
          <h3 className="amount-text" style={{ fontSize: '1.6rem', marginTop: '4px', color: 'var(--primary)' }}>
            {formatRupees(totalPaise)}
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
            Lifetime group expenditure
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Today's spend
          </span>
          <h3 className="amount-text" style={{ fontSize: '1.6rem', marginTop: '4px' }}>
            {formatRupees(reportData?.todaySpend || 0)}
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
            Spent today
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            This week's spend
          </span>
          <h3 className="amount-text" style={{ fontSize: '1.6rem', marginTop: '4px' }}>
            {formatRupees(reportData?.weekSpend || 0)}
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
            Past 7 days
          </span>
        </div>
      </div>

      {/* Donut Chart & Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Category distribution</h3>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              No expenses recorded yet.
            </div>
          ) : (
            <div style={{ height: 260, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Total</span>
                <span className="amount-text" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {formatRupees(totalPaise, false)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Category list with percentages */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Spending by category</h3>
          {categoryBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              No categories to display.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categoryBreakdown.map((cat) => {
                const percentage = totalPaise > 0 ? ((cat.total / totalPaise) * 100).toFixed(1) : 0;
                const color = getCategoryColor(cat.category);

                return (
                  <div
                    key={cat.category}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{cat.category}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          {cat.count} expense{cat.count !== 1 ? 's' : ''} ({percentage}%)
                        </span>
                      </div>
                    </div>

                    <span className="amount-text" style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                      {formatRupees(cat.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Period Grouped Expense Log */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Expense log ({period})</h3>
        {(!reportData?.expenses || reportData.expenses.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No expenses found for this period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Title</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Paid by</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {reportData.expenses.map((e) => (
                  <tr key={e._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(e.date)}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>
                      {e.title}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="badge" style={{ background: `${getCategoryColor(e.category)}15`, color: getCategoryColor(e.category) }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {e.payerNames}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span className="amount-text" style={{ fontSize: '0.98rem' }}>
                        {formatRupees(e.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
