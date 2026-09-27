// Two layered ridges: a distant navy range, and a snowfield-white foreground that
// melts into the page background. The foreground peak on the right borrows Mount
// Mansfield's forehead-nose-chin profile.
export default function Ridgeline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full sm:h-44"
    >
      <path
        fill="#1a2538"
        d="M0,200 L0,120 C50,104 100,70 160,72 C220,74 250,108 310,104 C380,99 410,40 470,32 C520,26 555,70 605,80 C670,92 715,62 775,52 C835,42 875,6 935,4 C985,2 1025,40 1075,58 C1135,78 1185,66 1245,48 C1305,30 1370,56 1440,74 L1440,200 Z"
      />
      <path
        fill="none"
        stroke="#4a90b8"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        d="M0,120 C50,104 100,70 160,72 C220,74 250,108 310,104 C380,99 410,40 470,32 C520,26 555,70 605,80 C670,92 715,62 775,52 C835,42 875,6 935,4 C985,2 1025,40 1075,58 C1135,78 1185,66 1245,48 C1305,30 1370,56 1440,74"
      />
      <path
        fill="#f5f7fa"
        d="M0,200 L0,168 C80,160 140,140 210,142 C280,144 330,164 400,160 C470,156 520,134 580,136 C640,138 690,160 760,156 C820,152 860,124 900,112 L944,100 C958,95 968,84 988,87 L1012,91 C1032,80 1052,70 1076,76 C1104,84 1134,106 1172,122 C1232,146 1300,146 1360,152 C1400,156 1420,158 1440,160 L1440,200 Z"
      />
    </svg>
  );
}
