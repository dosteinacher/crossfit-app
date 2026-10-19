import Image from 'next/image';
import type { ReactNode } from 'react';

export default function PhotoHero({
  image,
  mobileImage,
  imageAlt,
  objectPosition = 'center',
  mobileObjectPosition = 'center 45%',
  className = '',
  children,
}: {
  image: string;
  mobileImage?: string;
  imageAlt: string;
  objectPosition?: string;
  mobileObjectPosition?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative isolate overflow-hidden ${className}`}>
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className={`${mobileImage ? 'hidden md:block' : ''} object-cover`}
        style={{ filter: 'grayscale(1) contrast(1.15) brightness(.8)', objectPosition }}
      />
      {mobileImage && (
        <Image
          src={mobileImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover md:hidden"
          style={{ filter: 'grayscale(1) contrast(1.15) brightness(.8)', objectPosition: mobileObjectPosition }}
        />
      )}
      <div className="absolute inset-0 -z-0 bg-lime opacity-[.22] mix-blend-multiply" />
      <div
        className="absolute inset-0 -z-0 bg-[linear-gradient(180deg,rgba(11,12,10,.55)_0%,rgba(11,12,10,.2)_45%,rgba(11,12,10,.9)_100%)] md:bg-[linear-gradient(90deg,rgba(11,12,10,.92)_0%,rgba(11,12,10,.65)_45%,rgba(11,12,10,.1)_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-10 h-full">{children}</div>
    </section>
  );
}
