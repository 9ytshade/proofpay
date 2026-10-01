import { ReviewDesk } from "@/components/review-desk";

export default function ReviewsPage() {
  return (
    <main className="grain min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <ReviewDesk />
        <footer className="mono mt-12 flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-[10px] tracking-[0.08em] text-[var(--muted-ink)] sm:flex-row sm:items-center sm:justify-between">
          <span>PROOFPAY / REVIEW DESK</span>
          <span>STUDIONET · CHAIN 61999</span>
          <span aria-label="Copyright 9ytshade">© 9YTSHADE</span>
        </footer>
      </div>
    </main>
  );
}
