"use client";

import type { ReactNode } from "react";

export function ConfirmSubmit({
  children,
  message = "আপনি কি এই তথ্যটি মুছে ফেলতে চান?",
}: {
  children: ReactNode;
  message?: string;
}) {
  return <button className="table-action danger-text" type="submit" onClick={(event) => {
    if (!window.confirm(message)) event.preventDefault();
  }}>{children}</button>;
}
