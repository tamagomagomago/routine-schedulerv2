"use client";

interface FocusButtonProps {
  onClick: () => void;
}

export default function FocusButton({ onClick }: FocusButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      <span>⏱</span>
      <span>集中を始める</span>
    </button>
  );
}
