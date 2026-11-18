import { useCallback, useEffect, useState } from 'react';
import { getOrder, updateOrderStatus } from '../services/adminOrdersApi';
import { useAdminAuth } from './AdminAuthContext';
import AdminLayout from './components/AdminLayout';
import OrderDetail from './components/OrderDetail';
import OrdersList from './components/OrdersList';
import StatsPanel from './components/StatsPanel';
import './Admin.css';

export default function AdminDashboard() {
  const { admin, logout, markUnauthorized } = useAdminAuth();
  const [dataVersion, setDataVersion] = useState(0);
  const [detailVersion, setDetailVersion] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const refreshDetail = useCallback(() => {
    setDetail(null);
    setDetailError('');
    setUpdateError('');
    setDetailLoading(true);
    setDetailVersion((version) => version + 1);
  }, []);

  const handleSelectOrder = useCallback(
    (orderId) => {
      if (orderId === selectedOrderId) {
        return;
      }

      setSelectedOrderId(orderId);
      setDetail(null);
      setDetailLoading(true);
      setDetailError('');
      setUpdateError('');
    },
    [selectedOrderId]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedOrderId('');
    setDetail(null);
    setDetailError('');
    setUpdateError('');
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      return undefined;
    }

    let cancelled = false;

    getOrder(selectedOrderId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError?.status === 401) {
          markUnauthorized();
          return;
        }

        setDetailError(
          requestError?.message || 'No fue posible cargar el detalle.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrderId, detailVersion, markUnauthorized]);

  return (
    <AdminLayout admin={admin} onLogout={logout}>
      <StatsPanel version={dataVersion} onUnauthorized={markUnauthorized} />

      <OrdersList
        version={dataVersion}
        selectedOrderId={selectedOrderId}
        onSelect={handleSelectOrder}
        onUnauthorized={markUnauthorized}
      />

      {selectedOrderId && (
        <OrderDetail
          order={detail}
          loading={detailLoading}
          error={detailError}
          onClose={handleCloseDetail}
          onRetry={refreshDetail}
          updating={updating}
          updateError={updateError}
          onStatusChange={async ({ status, reason }) => {
            if (updating) {
              return false;
            }

            setUpdating(true);
            setUpdateError('');

            try {
              const updated = await updateOrderStatus({
                orderId: selectedOrderId,
                status,
                reason,
              });

              setDetail(updated);
              setDataVersion((version) => version + 1);

              return true;
            } catch (requestError) {
              if (requestError?.status === 401) {
                markUnauthorized();
              } else {
                setUpdateError(
                  requestError?.message || 'No se pudo actualizar el estado.'
                );
              }

              return false;
            } finally {
              setUpdating(false);
            }
          }}
        />
      )}
    </AdminLayout>
  );
}
