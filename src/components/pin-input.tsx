import React, { useState, type ChangeEvent } from "react";

export interface PinInputProps {
  digits?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  label?: string;
}

export function PinInput({
  digits = 4,
  onComplete,
  disabled,
  label = "PIN",
}: PinInputProps) {
  const [value, setValue] = useState("");
  const [masked, setMasked] = useState(true);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, digits);
    setValue(v);
    if (v.length === digits) onComplete(v);
  };

  return (
    <div>
      <label htmlFor="pin-input" className="bank-ui-label bank-ui-label-center">
        {label}
      </label>
      <input
        id="pin-input"
        type={masked ? "password" : "text"}
        inputMode="numeric"
        maxLength={digits}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="••••"
        className="bank-ui-input bank-ui-input-pin"
      />
      <label htmlFor="pin-show-toggle" className="bank-ui-toggle-label">
        <input
          id="pin-show-toggle"
          type="checkbox"
          checked={!masked}
          onChange={(e) => setMasked(!e.target.checked)}
        />
        Show PIN
      </label>
    </div>
  );
}
