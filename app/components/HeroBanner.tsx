"use client";
import Image from "next/image";

export default function HeroBanner() {
  return (
    <section className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
      {/* Background image */}
      <Image
        src="/track_pic_homepage.jpg"
        alt="Running track starting lanes leading forward"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {/* Soft fade so content flows into the page */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/10 to-white/90" />

      {/* Optional headline—you can remove this block if you want image only */}
      {/* <div className="absolute inset-0 flex items-end md:items-center justify-center pb-6 md:pb-0">
        <h1 className="text-2xl md:text-4xl font-semibold text-slate-900 drop-shadow-sm text-center px-4">
          Your recruiting journey starts here
        </h1>
      </div> */}
    </section>
  );
}
