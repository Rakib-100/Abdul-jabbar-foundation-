"use client";

import type { ReactNode } from "react";

export function ConfirmSubmit({ children }: { children: ReactNode }) {
  return <button className="table-action danger-text" type="submit" onClick={(event) => {
    if (!window.confirm("আপনি কি এই তথ্যটি মুছে ফেলতে চান?")) event.preventDefault();
  }}>{children}</button>;
}
