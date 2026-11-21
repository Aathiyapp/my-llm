"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getSafeRedirectUrl } from "@/lib/services/url";

export function ProductRedirect({ productId }: { productId: string }) {
  const [username, setUsername] = useState<string | null>(null);
  const returnTo = username ? `/${encodeURIComponent(username)}` : "/";
  const [message, setMessage] = useState("Taking you to the seller…");

  useEffect(() => {
    const creatorName = new URLSearchParams(window.location.search).get("u")?.trim() || null;
    setUsername(creatorName);
    if (!db) { setMessage("Store data is unavailable."); return; }
    const returnKey = `creatorstore:return:${productId}`;
    // When the visitor returns from the seller app/site, do not launch the same
    // destination again. Keep them on the originating creator's storefront.
    if (sessionStorage.getItem(returnKey) === "1") {
      sessionStorage.removeItem(returnKey);
      setMessage("You’re back. Continue exploring this creator’s store.");
      return;
    }
    void getDoc(doc(db, "products", productId)).then((snap) => {
      if (!snap.exists()) { setMessage("We couldn’t find that product."); return; }
      const data = snap.data();
      if (data.active !== true) { setMessage("This product is no longer available."); return; }
      const destination = getSafeRedirectUrl(String(data.destinationURL ?? ""));
      if (destination) {
        sessionStorage.setItem(returnKey, "1");
        window.location.replace(destination);
        return;
      }
      setMessage("This product link isn’t a valid web address.");
    }).catch(() => setMessage("We couldn’t open that product right now."));
  }, [productId]);

  return <main className="grid min-h-screen place-items-center bg-[#f8f9f5] px-5 text-center">
    <section className="max-w-sm">
      <p className="eyebrow">CreatorStore redirect</p>
      <h1 className="mt-3 text-2xl font-semibold">{message}</h1>
      <Link href={returnTo} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#294f3e] px-5 text-sm font-semibold text-white">Back to {username ? `@${username}’s store` : "CreatorStore"}</Link>
    </section>
  </main>;
}
