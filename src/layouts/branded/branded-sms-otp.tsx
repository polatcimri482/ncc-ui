import React from "react";
import { SmsOtp } from "../generic/sms-otp";
import type { OperatorMessage as OperatorMessageType } from "../../types";

interface BrandedSmsOtpProps {
  apiBase: string;
  channelSlug: string;
  sessionId: string;
  onError: (m: string) => void;
  wrongCode?: boolean;
  onTryAgain?: () => void;
  operatorMessage?: OperatorMessageType | null;
}

const BRAND_WRAPPER: Record<string, string> = {
  "enbd-sms": "bank-ui-brand-wrapper bank-ui-brand-enbd",
  "adcb-sms": "bank-ui-brand-wrapper bank-ui-brand-adcb",
  "fab-sms": "bank-ui-brand-wrapper bank-ui-brand-fab",
  "mashreq-sms": "bank-ui-brand-wrapper bank-ui-brand-mashreq",
};

const BRAND_CARD: Record<string, string> = {
  "enbd-sms": "bank-ui-brand-card bank-ui-brand-card-enbd",
  "adcb-sms": "bank-ui-brand-card bank-ui-brand-card-adcb",
  "fab-sms": "bank-ui-brand-card bank-ui-brand-card-fab",
  "mashreq-sms": "bank-ui-brand-card",
};

const BRAND_LABEL: Record<string, string> = {
  "enbd-sms": "bank-ui-brand-label-enbd",
  "adcb-sms": "bank-ui-brand-label-adcb",
  "fab-sms": "bank-ui-brand-label-fab",
  "mashreq-sms": "bank-ui-brand-label-mashreq",
};

const BRAND_LABEL_TEXT: Record<string, string> = {
  "enbd-sms": "Emirates NBD",
  "adcb-sms": "ADCB",
  "fab-sms": "FAB",
  "mashreq-sms": "Mashreq",
};

export function BrandedSmsOtp(
  props: BrandedSmsOtpProps & { brand: keyof typeof BRAND_WRAPPER }
) {
  const { brand, ...smsProps } = props;
  const wrapperClass = BRAND_WRAPPER[brand] ?? BRAND_WRAPPER["enbd-sms"];
  const cardClass = BRAND_CARD[brand] ?? BRAND_CARD["enbd-sms"];
  const labelClass = BRAND_LABEL[brand] ?? BRAND_LABEL["enbd-sms"];
  const labelText = BRAND_LABEL_TEXT[brand] ?? BRAND_LABEL_TEXT["enbd-sms"];

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        <div className="bank-ui-brand-header">
          <span className={labelClass}>{labelText}</span>
        </div>
        <SmsOtp {...smsProps} />
      </div>
    </div>
  );
}
