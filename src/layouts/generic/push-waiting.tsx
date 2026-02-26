import React from "react";
import { Spinner } from "../../components/spinner";

export function PushWaiting() {
  return (
    <div className="bank-ui-layout-center">
      <div className="bank-ui-spinner-wrap">
        <Spinner size={64} />
      </div>
      <h2 className="bank-ui-heading">Confirm on your device</h2>
      <p className="bank-ui-body">
        A push notification has been sent to your mobile app. Please approve the
        transaction on your device.
      </p>
    </div>
  );
}
