type NoticeContentProps = {
  content: string;
};

export function NoticeContent({ content }: NoticeContentProps) {
  return (
    <>
      <p>{content}</p>
      {content.length > 180 && (
        <details className="notice-card__more">
          <summary>সম্পূর্ণ নোটিশ দেখুন</summary>
          <p>{content}</p>
        </details>
      )}
    </>
  );
}
