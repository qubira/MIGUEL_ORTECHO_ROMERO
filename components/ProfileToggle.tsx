"use client";

import { useState } from "react";
import ProfileSettings from "./ProfileSettings";

export default function ProfileToggle({ username }: { username: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        Mi perfil
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Mi perfil</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>
            <ProfileSettings username={username} />
          </div>
        </div>
      )}
    </>
  );
}
