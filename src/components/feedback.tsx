const messages: Record<string, string> = {
  saved: "তথ্য সফলভাবে সংরক্ষণ করা হয়েছে।",
  deleted: "তথ্য সফলভাবে মুছে ফেলা হয়েছে।",
  updated: "তথ্য সফলভাবে হালনাগাদ করা হয়েছে।",
  error: "দুঃখিত, কাজটি সম্পন্ন হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।",
  denied: "এই কাজটি করার অনুমতি আপনার নেই।",
  "signout-error": "লগআউট করা যায়নি। আবার চেষ্টা করুন।",
  "image-error": "ছবি JPG, JPEG বা PNG হতে হবে এবং ২ MB-এর বেশি হতে পারবে না।",
  "phone-locked": "লগইন মোবাইল নম্বর পরিবর্তন করা যায় না। নম্বর বদলাতে প্রশাসকের সঙ্গে যোগাযোগ করুন।",
  recorded: "যাচাইকৃত অনুদান মূল হিসাবে যোগ করা হয়েছে।",
  rejected: "অনুদানের আবেদনটি বাতিল হিসেবে চিহ্নিত হয়েছে।",
  duplicate: "এই অনুদানের ট্রানজেকশন আইডি দিয়ে হিসাব আগেই যোগ হয়েছে।",
  submitted: "অনুদানের তথ্য প্রশাসকের কাছে পাঠানো হয়েছে। যাচাইয়ের পর হিসাবে যোগ হবে।",
};

export function Feedback({ status }: { status?: string }) {
  if (!status || !messages[status]) return null;
  const isSuccess = ["saved", "deleted", "updated", "recorded", "rejected"].includes(status);
  return <p className={`form-alert${isSuccess ? " form-alert--success" : ""}`} role="status">{messages[status]}</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
