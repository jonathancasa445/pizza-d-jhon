import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getWhatsAppPhone,
  isWhatsAppConfigured,
  WHATSAPP_MISSING_MESSAGE,
} from '../config/whatsapp';
import { createOrder as registerOrder } from '../services/ordersApi';
import {
  getCartCount,
  getCartItemId,
  getCartTotalCents,
} from '../utils/cart';
import { formatCents } from '../utils/money';
import {
  buildRegisteredOrderMessage,
  buildWhatsAppUrl,
  getModalityLabel,
  validateOrderForm,
} from '../utils/orderMessage';
import {
  buildOrderRequest,
  LEGACY_CART_MESSAGE,
} from '../utils/orderPayload';
import CartItem from './CartItem';

const INITIAL_FORM = {
  name: '',
  modality: '',
  address: '',
  reference: '',
  observations: '',
};

const CHECKOUT_STORAGE_KEY = 'pizza-checkout-success';

function readStoredCheckout(cartSignature) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      CHECKOUT_STORAGE_KEY
    );

    if (!rawValue) {
      return null;
    }

    const stored = JSON.parse(rawValue);
    const isValid =
      stored &&
      stored.cartSignature === cartSignature &&
      stored.order &&
      typeof stored.order.orderId === 'string' &&
      Number.isInteger(stored.order.totalCents);

    if (!isValid) {
      window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

function saveStoredCheckout(value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {
    // La confirmación sigue visible aunque sessionStorage no esté disponible.
  }
}

function clearStoredCheckout() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch {
    // No hay nada más que limpiar.
  }
}

function generateIdempotencyKey() {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error(
      'El navegador no puede generar una clave segura para el pedido.'
    );
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function CartDrawer({
  cart,
  onClose,
  onChangeQuantity,
  onRemove,
  onClear,
  onGoToMenu,
}) {
  const cartSignature = useMemo(() => JSON.stringify(cart), [cart]);
  const [initialCheckout] = useState(() =>
    readStoredCheckout(cartSignature)
  );
  const [view, setView] = useState(
    initialCheckout ? 'success' : 'cart'
  );
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredOrder, setRegisteredOrder] = useState(
    initialCheckout?.order ?? null
  );
  const closeButtonRef = useRef(null);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(
    initialCheckout?.idempotencyKey ?? ''
  );
  const idempotencySignatureRef = useRef('');
  const successCartSignatureRef = useRef(
    initialCheckout?.cartSignature ?? ''
  );

  const cartCount = getCartCount(cart);
  const cartTotalCents = getCartTotalCents(cart);
  const whatsappReady = isWhatsAppConfigured();
  const showingSuccess =
    view === 'success' && Boolean(registeredOrder);
  const showingCheckout =
    view === 'checkout' && cart.length > 0 && !showingSuccess;
  const deliverySelected = form.modality === 'delivery';
  const hasLegacyItems = cart.some(
    (item) =>
      !item ||
      typeof item !== 'object' ||
      typeof item.productKey !== 'string' ||
      !item.productKey ||
      typeof item.presentationKey !== 'string' ||
      !item.presentationKey
  );
  const displayedTotalCents = showingSuccess
    ? registeredOrder.totalCents
    : cartTotalCents;
  const totalChanged =
    showingSuccess && registeredOrder.totalCents !== cartTotalCents;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!registeredOrder) {
      return;
    }

    if (successCartSignatureRef.current === cartSignature) {
      return;
    }

    clearStoredCheckout();
    setRegisteredOrder(null);
    setView('cart');
    setSubmitError('');
    setSubmitNotice('');
    idempotencyKeyRef.current = '';
    idempotencySignatureRef.current = '';
    successCartSignatureRef.current = '';
  }, [cartSignature, registeredOrder]);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });

    setSubmitError('');
    setSubmitNotice('');
  }

  function handleContinue() {
    if (cart.length === 0) {
      return;
    }

    setErrors({});
    setSubmitError('');
    setSubmitNotice('');
    setView('checkout');
  }

  function handleBackToCart() {
    if (submittingRef.current) {
      return;
    }

    setSubmitError('');
    setSubmitNotice('');
    setView('cart');
  }

  function handleNewOrder() {
    clearStoredCheckout();
    setRegisteredOrder(null);
    setView('cart');
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError('');
    setSubmitNotice('');
    idempotencyKeyRef.current = '';
    idempotencySignatureRef.current = '';
    successCartSignatureRef.current = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const nextErrors = validateOrderForm(form);
    setErrors(nextErrors);
    setSubmitError('');
    setSubmitNotice('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    let payload;

    try {
      payload = buildOrderRequest(cart, form);
    } catch (error) {
      setSubmitError(
        error?.message ||
          'No se pudo preparar el pedido. Revisa el carrito e inténtalo de nuevo.'
      );
      return;
    }

    const requestSignature = JSON.stringify(payload);

    if (
      idempotencyKeyRef.current &&
      idempotencySignatureRef.current !== requestSignature
    ) {
      idempotencyKeyRef.current = '';
    }

    if (!idempotencyKeyRef.current) {
      try {
        idempotencyKeyRef.current = generateIdempotencyKey();
      } catch (error) {
        setSubmitError(error.message);
        return;
      }

      idempotencySignatureRef.current = requestSignature;
    }

    const idempotencyKey = idempotencyKeyRef.current;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const order = await registerOrder({
        payload,
        idempotencyKey,
      });

      idempotencySignatureRef.current = requestSignature;
      successCartSignatureRef.current = cartSignature;
      setRegisteredOrder(order);
      setView('success');
      saveStoredCheckout({
        cartSignature,
        idempotencyKey,
        order,
      });
      setSubmitNotice(
        order.duplicate
          ? 'Este pedido ya estaba registrado. Se muestra la confirmación existente.'
          : ''
      );
    } catch (error) {
      setSubmitError(
        error?.message ||
          'No se pudo registrar el pedido. Inténtalo de nuevo.'
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleOpenWhatsApp() {
    if (!registeredOrder) {
      return;
    }

    if (!whatsappReady) {
      setSubmitError(WHATSAPP_MISSING_MESSAGE);
      return;
    }

    const whatsappUrl = buildWhatsAppUrl(
      getWhatsAppPhone(),
      buildRegisteredOrderMessage(registeredOrder)
    );

    if (!whatsappUrl) {
      setSubmitError(WHATSAPP_MISSING_MESSAGE);
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setSubmitError('');
    setSubmitNotice(
      'WhatsApp debería abrirse en una nueva pestaña. Revisa el mensaje y envíalo manualmente. El pedido ya está registrado y el carrito no se ha vaciado.'
    );
  }

  return (
    <div
      className="cart-drawer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <header className="cart-drawer-header">
          <div>
            <p className="cart-drawer-eyebrow">Pizza D' Jhon</p>
            <h2 id="cart-drawer-title">
              {showingSuccess
                ? 'Pedido registrado'
                : showingCheckout
                  ? 'Datos del pedido'
                  : 'Tu carrito'}
            </h2>
            <p className="cart-drawer-count">
              {cartCount}{' '}
              {cartCount === 1 ? 'producto' : 'productos'}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="cart-drawer-close"
            onClick={onClose}
            aria-label="Cerrar carrito"
          >
            ×
          </button>
        </header>

        <div className="cart-drawer-body">
          {showingSuccess ? (
            <div className="checkout-success" role="status">
              <p className="checkout-success-eyebrow">
                Confirmación del servidor
              </p>
              <h3>Pedido registrado</h3>
              <p>
                El pedido quedó guardado con estado pendiente de
                confirmación. No se ha realizado ninguna venta todavía.
              </p>

              <dl className="checkout-success-details">
                <div>
                  <dt>Identificador del pedido</dt>
                  <dd>
                    <span className="checkout-success-id">
                      {registeredOrder.orderId}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{registeredOrder.status}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{registeredOrder.customer?.name}</dd>
                </div>
                <div>
                  <dt>Modalidad</dt>
                  <dd>
                    {getModalityLabel(registeredOrder.modality)}
                  </dd>
                </div>
                <div>
                  <dt>Total calculado por el servidor</dt>
                  <dd className="checkout-success-total">
                    {formatCents(registeredOrder.totalCents)}
                  </dd>
                </div>
              </dl>

              {totalChanged && (
                <p
                  className="checkout-config-warning"
                  role="alert"
                >
                  El total mostrado en el carrito era{' '}
                  {formatCents(cartTotalCents)}. El servidor calculó{' '}
                  {formatCents(registeredOrder.totalCents)} según el
                  catálogo vigente; ese es el importe registrado.
                </p>
              )}

              {!whatsappReady && (
                <p
                  className="checkout-config-warning"
                  role="alert"
                >
                  {WHATSAPP_MISSING_MESSAGE} El pedido ya quedó
                  registrado correctamente.
                </p>
              )}

              {submitError && (
                <p
                  className="checkout-error checkout-submit-error"
                  role="alert"
                >
                  {submitError}
                </p>
              )}

              {submitNotice && (
                <p className="checkout-notice" role="status">
                  {submitNotice}
                </p>
              )}

              <p className="checkout-note">
                Para avisar al local, abre WhatsApp, revisa el mensaje
                generado desde la orden registrada y envíalo
                manualmente. Abrir WhatsApp no significa que el
                mensaje haya sido enviado.
              </p>
            </div>
          ) : cart.length === 0 ? (
            <div className="cart-drawer-empty">
              <p className="cart-drawer-empty-title">
                Tu carrito está vacío.
              </p>
              <p>
                Elige tus productos favoritos y vuelve cuando quieras.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={onGoToMenu}
              >
                Volver al menú
              </button>
            </div>
          ) : showingCheckout ? (
            <form
              id="checkout-form"
              className="checkout-form"
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isSubmitting}
            >
              {hasLegacyItems && (
                <p
                  className="checkout-config-warning"
                  role="alert"
                >
                  {LEGACY_CART_MESSAGE}
                </p>
              )}

              {!whatsappReady && (
                <p
                  className="checkout-config-warning"
                  role="alert"
                >
                  {WHATSAPP_MISSING_MESSAGE} El pedido se puede
                  registrar igualmente.
                </p>
              )}

              <div className="checkout-field">
                <label htmlFor="checkout-name">
                  Nombre del cliente *
                </label>
                <input
                  id="checkout-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={form.name}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                  className={errors.name ? 'is-invalid' : ''}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? 'checkout-name-error' : undefined
                  }
                />
                {errors.name && (
                  <p
                    id="checkout-name-error"
                    className="checkout-error"
                    role="alert"
                  >
                    {errors.name}
                  </p>
                )}
              </div>

              <fieldset className="checkout-field checkout-modality">
                <legend>Modalidad del pedido *</legend>

                <label className="checkout-radio">
                  <input
                    type="radio"
                    name="modality"
                    value="delivery"
                    checked={form.modality === 'delivery'}
                    onChange={handleFieldChange}
                    disabled={isSubmitting}
                  />
                  Domicilio
                </label>

                <label className="checkout-radio">
                  <input
                    type="radio"
                    name="modality"
                    value="pickup"
                    checked={form.modality === 'pickup'}
                    onChange={handleFieldChange}
                    disabled={isSubmitting}
                  />
                  Retiro en el local
                </label>

                {errors.modality && (
                  <p className="checkout-error" role="alert">
                    {errors.modality}
                  </p>
                )}
              </fieldset>

              {deliverySelected && (
                <div className="checkout-field">
                  <label htmlFor="checkout-address">
                    Dirección *
                  </label>
                  <input
                    id="checkout-address"
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    maxLength={200}
                    value={form.address}
                    onChange={handleFieldChange}
                    disabled={isSubmitting}
                    className={
                      errors.address ? 'is-invalid' : ''
                    }
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={
                      errors.address
                        ? 'checkout-address-error'
                        : undefined
                    }
                  />
                  {errors.address && (
                    <p
                      id="checkout-address-error"
                      className="checkout-error"
                      role="alert"
                    >
                      {errors.address}
                    </p>
                  )}
                </div>
              )}

              <div className="checkout-field">
                <label htmlFor="checkout-reference">
                  Referencia o indicaciones adicionales
                </label>
                <textarea
                  id="checkout-reference"
                  name="reference"
                  rows="2"
                  maxLength={200}
                  value={form.reference}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                  className={
                    errors.reference ? 'is-invalid' : ''
                  }
                  aria-invalid={Boolean(errors.reference)}
                  aria-describedby={
                    errors.reference
                      ? 'checkout-reference-error'
                      : undefined
                  }
                />
                {errors.reference && (
                  <p
                    id="checkout-reference-error"
                    className="checkout-error"
                    role="alert"
                  >
                    {errors.reference}
                  </p>
                )}
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-observations">
                  Observaciones del pedido
                </label>
                <textarea
                  id="checkout-observations"
                  name="observations"
                  rows="3"
                  maxLength={500}
                  value={form.observations}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                  className={
                    errors.observations ? 'is-invalid' : ''
                  }
                  aria-invalid={Boolean(errors.observations)}
                  aria-describedby={
                    errors.observations
                      ? 'checkout-observations-error'
                      : undefined
                  }
                />
                {errors.observations && (
                  <p
                    id="checkout-observations-error"
                    className="checkout-error"
                    role="alert"
                  >
                    {errors.observations}
                  </p>
                )}
              </div>

              {submitError && (
                <p
                  className="checkout-error checkout-submit-error"
                  role="alert"
                >
                  {submitError}
                </p>
              )}

              {submitNotice && (
                <p className="checkout-notice" role="status">
                  {submitNotice}
                </p>
              )}

              <p className="checkout-note">
                Al registrar el pedido, el servidor validará el
                catálogo y calculará el total definitivo. Después
                podrás abrir WhatsApp con el mensaje generado desde la
                orden registrada.
              </p>
            </form>
          ) : (
            <div className="cart-drawer-list">
              <div className="cart-drawer-toolbar">
                <span>Resumen del pedido</span>

                <button
                  type="button"
                  className="remove-button"
                  onClick={onClear}
                >
                  Vaciar carrito
                </button>
              </div>

              {cart.map((item, index) => (
                <CartItem
                  key={`${getCartItemId(item, index)}-${index}`}
                  item={item}
                  index={index}
                  onChangeQuantity={onChangeQuantity}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>

        {(cart.length > 0 || showingSuccess) && (
          <footer className="cart-drawer-footer">
            <div className="cart-drawer-total">
              <span>
                {showingSuccess
                  ? 'Total registrado'
                  : showingCheckout
                    ? 'Total del pedido'
                    : 'Total'}
              </span>
              <strong>{formatCents(displayedTotalCents)}</strong>
            </div>

            {showingSuccess ? (
              <div className="checkout-footer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleNewOrder}
                >
                  Nuevo pedido
                </button>
                <button
                  type="button"
                  className="whatsapp-button"
                  onClick={handleOpenWhatsApp}
                  disabled={!whatsappReady}
                >
                  Abrir WhatsApp
                </button>
              </div>
            ) : showingCheckout ? (
              <div className="checkout-footer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleBackToCart}
                  disabled={isSubmitting}
                >
                  Volver al pedido
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  className="whatsapp-button"
                  disabled={isSubmitting || hasLegacyItems}
                >
                  {isSubmitting
                    ? 'Registrando...'
                    : 'Registrar pedido'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="whatsapp-button"
                onClick={handleContinue}
              >
                Continuar con el pedido
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
