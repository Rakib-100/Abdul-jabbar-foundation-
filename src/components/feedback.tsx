const messages: Record<string, string> = {
  saved: "তথ্য সফলভাবে সংরক্ষণ করা হয়েছে।",
  deleted: "তথ্য সফলভাবে মুছে ফেলা হয়েছে।",
  updated: "তথ্য সফলভাবে হালনাগাদ করা হয়েছে।",
  error: "দুঃখিত, কাজটি সম্পন্ন হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।",
  denied: "এই কাজটি করার অনুমতি আপনার নেই।",
  "signout-error": "লগআউট করা যায়নি। আবার চেষ্টা করুন।",
  "image-error": "ছবি JPG, JPEG বা PNG হতে হবে এবং ২ MB-এর বেশি হতে পারবে না।",
};

export function Feedback({ status }: { status?: string }) {
  if (!status || !messages[status]) return null;
  const isSuccess = ["saved", "deleted", "updated"].includes(status);
  return <p className={`form-alert${isSuccess ? " form-alert--success" : ""}`} role="status">{messages[status]}</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
