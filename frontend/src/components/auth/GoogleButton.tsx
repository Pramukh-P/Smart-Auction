import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { googleAuth } from "../../store/slices";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleButtonProps {
  // Pass a role only on the Register page (from the Bidder/Auctioneer
  // toggle) so a brand-new account can be created with it. Leave it
  // undefined on the Login page — there, only existing accounts can sign
  // in via Google.
  role?: "Bidder" | "Auctioneer";
}

const GoogleButton: React.FC<GoogleButtonProps> = ({ role }) => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector(s => s.auth);
  const containerRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef(role);
  roleRef.current = role;
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    let attempts = 0;

    const init = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          // Read the latest role from the ref rather than closing over the
          // prop, so we don't need to re-run `initialize()` (and trigger
          // Google's "called multiple times" warning) every time the
          // Bidder/Auctioneer toggle changes on the Register page.
          callback: (resp: { credential?: string }) => {
            if (resp?.credential) dispatch(googleAuth({ credential: resp.credential, role: roleRef.current }));
          },
        });
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(containerRef.current, {
            theme: "outline",
            size: "large",
            width: 320,
            text: role ? "signup_with" : "signin_with",
          });
        }
        setScriptReady(true);
      } else if (attempts < 50) {
        attempts += 1;
        setTimeout(init, 150);
      }
    };
    init();
    return () => { cancelled = true; };
    // Run once per mount (Login vs Register are separate mounts/pages) —
    // role toggling within Register is handled via roleRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div ref={containerRef} className={`flex justify-center ${loading ? "opacity-60 pointer-events-none" : ""}`} />
      {!scriptReady && <p className="text-xs text-gray-400">Loading Google Sign-In…</p>}
    </div>
  );
};

export default GoogleButton;
