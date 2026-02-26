import React from "react";
import { Spinner } from "../../components/spinner";

interface PushWaitingProps {
  bank?: string;
}

export function PushWaiting({ bank }: PushWaitingProps) {
  return (
    <div className="bank-ui-layout-center">
      <div className="bank-ui-spinner-wrap">
        <Spinner size={64} />
      </div>
      <h2 className="bank-ui-heading">Confirm on your device</h2>
      <p className="bank-ui-body">
        {bank
          ? `A push notification has been sent by ${bank}. Please approve the transaction on your device.`
          : "A push notification has been sent to your mobile app. Please approve the transaction on your device."}
      </p>
    </div>
  );
}
