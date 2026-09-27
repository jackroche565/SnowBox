// Rolling Green Mountains ridges with a pine treeline on the middle crest. The snow-white
// foreground melts into the page and carries Mount Mansfield's forehead-nose-chin profile.
// The artwork is generated into public/ridgeline.svg and cropped (never stretched) to fit.
export default function Ridgeline() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative SVG, no optimization needed
    <img
      src="/ridgeline.svg"
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full object-cover object-bottom sm:h-44"
    />
  );
}
