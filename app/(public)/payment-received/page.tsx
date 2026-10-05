export const metadata = { title: "Payment received" };

export default function PaymentReceivedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0c0c0c" }}>
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-3xl"
          style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>✓</div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Thank you!</h1>
        <p className="text-gray-400 text-sm">
          Your payment to Yos Fitness Studio has been received. Your receipt will be shared with you shortly.
        </p>
      </div>
    </main>
  );
}
