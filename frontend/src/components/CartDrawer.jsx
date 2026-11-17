import { useEffect, useRef, useState } from 'react';
import {
  getWhatsAppPhone,
  isWhatsAppConfigured,
  WHATSAPP_MISSING_MESSAGE,
} from '../config/whatsapp';
import {
  getCartCount,
  getCartItemId,
  getCartTotalCents,
} from '../utils/cart';
import { formatCents } from '../utils/money';
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  validateOrderForm,
} from '../utils/orderMessage';
import CartItem from './CartItem';

const INITIAL_FORM = {
  name: '',
  modality: '',
  address: '',
  reference: '',
  observations: '',
};

function CartDrawer({
  cart,
  onClose,
  onChangeQuantity,
  onRemove,
  onClear,
  onGoToMenu,
}) {
  const [view, setView] = useState('cart');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');
  const closeButtonRef = useRef(null);

  const cartCount = getCartCount(cart);
  const cartTotalCents = getCartTotalCents(cart);
  const whatsappReady = isWhatsAppConfigured();
  const showingCheckout = view === 'checkout' && cart.length > 0;
  const deliverySelected = form.modality === 'delivery';

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
    setSubmitError('');
    setSubmitNotice('');
    setView('cart');
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateOrderForm(form);
    setErrors(nextErrors);
    setSubmitError('');
    setSubmitNotice('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!whatsappReady) {
      setSubmitError(WHATSAPP_MISSING_MESSAGE);
      return;
    }

    const message = buildOrderMessage({
      cart,
      customer: form,
    });
    const whatsappUrl = buildWhatsAppUrl(
      getWhatsAppPhone(),
      message
    );

    if (!whatsappUrl) {
      setSubmitError(WHATSAPP_MISSING_MESSAGE);
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setSubmitNotice(
      'WhatsApp debería abrirse en una nueva pestaña. Revisa el mensaje y envíalo manualmente. Si no se abrió, permite las ventanas emergentes e inténtalo de nuevo. El carrito no se ha vaciado.'
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
              {showingCheckout ? 'Datos del pedido' : 'Tu carrito'}
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
          {cart.length === 0 ? (
            <div className="cart-drawer-empty">
              <p className="cart-drawer-empty-title">
                Tu carrito está vacío.
              </p>
              <p>
                Elige tus pizzas favoritas y vuelve cuando quieras.
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
            >
              {!whatsappReady && (
                <p className="checkout-config-warning" role="alert">
                  {WHATSAPP_MISSING_MESSAGE}
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
                  value={form.name}
                  onChange={handleFieldChange}
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
                    value={form.address}
                    onChange={handleFieldChange}
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
                  value={form.reference}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-observations">
                  Observaciones del pedido
                </label>
                <textarea
                  id="checkout-observations"
                  name="observations"
                  rows="3"
                  value={form.observations}
                  onChange={handleFieldChange}
                />
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
                WhatsApp solo abrirá la conversación con el mensaje
                preparado. Deberás revisarlo y enviarlo manualmente.
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

        {cart.length > 0 && (
          <footer className="cart-drawer-footer">
            <div className="cart-drawer-total">
              <span>
                {showingCheckout ? 'Total del pedido' : 'Total'}
              </span>
              <strong>{formatCents(cartTotalCents)}</strong>
            </div>

            {showingCheckout ? (
              <div className="checkout-footer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleBackToCart}
                >
                  Volver al pedido
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  className="whatsapp-button"
                >
                  Abrir WhatsApp
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="whatsapp-button"
                onClick={handleContinue}
              >
                Continuar por WhatsApp
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
