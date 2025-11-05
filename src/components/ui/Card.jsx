import React from "react";

export default function Card({ title, icon, children }) {
  return (
    <section className="bg-bg-secondary rounded-lg border border-border-primary p-4 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-text-primary">
        <span className="text-xl" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}
