// src/components/ActionTile.tsx
import { Link } from "react-router-dom";

type Props = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  to?: string;                 // use Link when present
  onClick?: () => void;        // or button for modal actions
  accent?: "blue" | "green" | "indigo";
};

export default function ActionTile({ title, description, icon, to, onClick, accent = "indigo" }: Props) {
  const accentCls =
    accent === "blue" ? "border-blue-200 hover:border-blue-300" :
    accent === "green" ? "border-green-200 hover:border-green-300" :
    "border-indigo-200 hover:border-indigo-300";

  const Inner = (
    <div className={`h-full rounded-lg border ${accentCls} bg-white p-4 shadow-sm hover:shadow transition`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-9 w-9 rounded-md bg-gray-100 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg">
        {Inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg"
    >
      {Inner}
    </button>
  );
}
