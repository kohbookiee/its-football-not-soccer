export default function Football() {
  return (
    <svg className="football" viewBox="-16 -16 32 32" aria-hidden="true">
      <circle r="15" fill="#fff" stroke="#111" strokeWidth="1.6" />
      <g clipPath="url(#football-clip)">
        <polygon fill="#111" points="0,-6.1 5.8,-1.9 3.6,5 -3.6,5 -5.8,-1.9" />
        <polygon fill="#111" points="0,-15.6 4.7,-12.6 2.6,-7.4 -2.6,-7.4 -4.7,-12.6" />
        <polygon fill="#111" transform="rotate(72)" points="0,-15.6 4.7,-12.6 2.6,-7.4 -2.6,-7.4 -4.7,-12.6" />
        <polygon fill="#111" transform="rotate(144)" points="0,-15.6 4.7,-12.6 2.6,-7.4 -2.6,-7.4 -4.7,-12.6" />
        <polygon fill="#111" transform="rotate(216)" points="0,-15.6 4.7,-12.6 2.6,-7.4 -2.6,-7.4 -4.7,-12.6" />
        <polygon fill="#111" transform="rotate(288)" points="0,-15.6 4.7,-12.6 2.6,-7.4 -2.6,-7.4 -4.7,-12.6" />
      </g>
      <defs>
        <clipPath id="football-clip">
          <circle r="14.2" />
        </clipPath>
      </defs>
    </svg>
  )
}
