import Image from "next/image";
export default function Brand({ tagline = false }: { tagline?: boolean }) {
  return (
    <div className="brand-lockup">
      <div className="brand">
        <Image src="/pakka-mark.svg" width={44} height={48} alt="" priority />
        <span>PAKKA</span>
      </div>
      {tagline && <p>Every Rupee. Every Promise. Remembered.</p>}
    </div>
  );
}
