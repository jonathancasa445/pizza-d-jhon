import { statusLabel } from '../../utils/adminOrders';

export default function StatusBadge({ status }) {
  const label = statusLabel(status);
  const modifier = typeof status === 'string' ? status.replace(/[^a-z_]/g, '') : 'unknown';

  return (
    <span className={`admin-status admin-status--${modifier}`}>{label}</span>
  );
}
