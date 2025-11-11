"use client";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}: AlertModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          border: "border-green-600",
          bg: "bg-green-900/20",
          icon: (
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          iconBg: "bg-green-600",
        };
      case "error":
        return {
          border: "border-red-600",
          bg: "bg-red-900/20",
          icon: (
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          iconBg: "bg-red-600",
        };
      case "warning":
        return {
          border: "border-yellow-600",
          bg: "bg-yellow-900/20",
          icon: (
            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          iconBg: "bg-yellow-600",
        };
      default:
        return {
          border: "border-blue-600",
          bg: "bg-blue-900/20",
          icon: (
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: "bg-blue-600",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-md bg-black border ${styles.border} rounded-lg shadow-2xl`}>
        <div className={`p-6 border-b ${styles.border} ${styles.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              {styles.icon}
            </div>
            <h2 className="text-xl font-semibold text-white">
              {title || (type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Information")}
            </h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-300 whitespace-pre-line">{message}</p>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            className="px-6 py-2 rounded bg-[#f08c17] text-black font-medium hover:bg-[#d67a14]"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
