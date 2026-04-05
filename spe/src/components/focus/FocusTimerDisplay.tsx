"use client";

interface FocusTimerDisplayProps {
  elapsedSeconds: number;
}

export default function FocusTimerDisplay({ elapsedSeconds }: FocusTimerDisplayProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="py-8">
      <p className="text-6xl font-bold text-blue-300 tracking-wider">
        {formattedTime}
      </p>
    </div>
  );
}
