/** Newly drawn from the supplied Professional Handshake reference; no retired geometry. */
export const INTRO_ARTWORK_ID = "pakka-handshake-reference-v4";
export default function IntroHandshake() {
  return (
    <svg
      className="handshake-artwork"
      data-artwork={INTRO_ARTWORK_ID}
      viewBox="450 240 920 470"
      fill="none"
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="v4-peach"
          x1="788"
          y1="319"
          x2="896"
          y2="630"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffe0c6" />
          <stop offset=".6" stopColor="#f2bea2" />
          <stop offset="1" stopColor="#df9b82" />
        </linearGradient>
        <linearGradient
          id="v4-bronze"
          x1="986"
          y1="304"
          x2="944"
          y2="624"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0b18a" />
          <stop offset=".55" stopColor="#da9571" />
          <stop offset="1" stopColor="#b77657" />
        </linearGradient>
        <linearGradient
          id="v4-purple"
          x1="478"
          y1="302"
          x2="608"
          y2="573"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9d5be9" />
          <stop offset=".5" stopColor="#7833c4" />
          <stop offset="1" stopColor="#582296" />
        </linearGradient>
        <linearGradient
          id="v4-white"
          x1="1228"
          y1="309"
          x2="1298"
          y2="552"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset=".65" stopColor="#f6f0ff" />
          <stop offset="1" stopColor="#e6d9f6" />
        </linearGradient>
        <linearGradient id="v4-under-finger" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#edb493" />
          <stop offset="1" stopColor="#d18e6d" />
        </linearGradient>
        <linearGradient
          id="v4-orbit"
          x1="493"
          y1="641"
          x2="1317"
          y2="288"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity=".15" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".8" />
          <stop offset="1" stopColor="#c7a7e9" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <path
        className="handshake-v4-orbit"
        d="M486 626C526 505 1086 254 1298 273C1417 284 1310 405 1174 479"
        stroke="url(#v4-orbit)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g className="handshake-v4-pair">
        {/* The far hand and wrist sit behind the light hand. */}
        <g className="handshake-v4-right">
          <path
            d="M1191 349C1159 353 1130 362 1100 360C1074 359 1047 343 1019 333L972 315C957 309 944 310 927 314L864 331C842 336 832 349 830 368L824 410C821 433 838 451 861 461L927 486C951 496 980 513 1005 517C1034 522 1055 505 1079 490C1101 476 1133 473 1167 472L1205 469Z"
            fill="url(#v4-bronze)"
            stroke="#bd7c59"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M1118 375C1125 398 1131 425 1128 450M1148 369C1156 394 1161 421 1159 444M1037 370C1065 383 1084 406 1087 430"
            stroke="#b77353"
            strokeOpacity=".4"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M1147 428C1163 420 1176 419 1188 420L1195 451L1153 461Z"
            fill="#9f624c"
            fillOpacity=".14"
          />
        </g>
        {/* Broad left back-of-hand and four downward-swept fingers, not the retired pose. */}
        <g className="handshake-v4-left">
          <path
            d="M654 349C682 355 702 364 726 361C750 358 779 339 806 326C827 315 841 309 862 308L926 300C944 298 958 306 972 319L1004 352C1014 363 1016 378 1009 391C1001 406 988 411 976 414C995 429 1011 443 1025 459L1071 516C1087 535 1083 554 1069 562C1056 569 1044 560 1031 549L966 496L1030 557C1047 574 1044 591 1030 599C1017 607 1004 598 991 587L929 534L985 590C1000 605 995 621 982 627C969 633 957 625 946 615L894 571L939 617C951 630 946 643 934 648C923 652 912 646 901 636L848 593C831 580 819 564 805 550C788 534 769 530 749 524L707 511C690 506 673 506 650 503L632 500Z"
            fill="url(#v4-peach)"
            stroke="#d39b80"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M689 374C711 381 733 380 756 370L811 343C823 338 834 338 846 337C819 358 805 383 798 410C790 444 802 479 819 503C778 489 742 480 703 470L670 461Z"
            fill="#fff0dc"
            fillOpacity=".26"
          />
          <path
            d="M946 467C960 486 979 504 1003 524M920 508C938 531 960 550 981 568M887 550C902 569 922 590 939 603"
            stroke="#c98c73"
            strokeOpacity=".62"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M939 457C942 469 951 480 962 491M872 528C875 537 880 545 887 550"
            stroke="#e9b095"
            strokeWidth="6"
            strokeOpacity=".7"
            strokeLinecap="round"
          />
          <path
            d="M774 492C785 496 796 503 803 514M816 524C824 530 829 536 833 543"
            stroke="#c89073"
            strokeOpacity=".32"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* Four near fingers wrap beneath the other hand, with individually drawn nail beds. */}
        <g className="handshake-v4-right">
          <path
            d="M760 512C746 509 735 519 725 535C715 550 711 564 719 575C727 587 741 584 752 574L778 542C789 528 778 515 760 512Z"
            fill="url(#v4-under-finger)"
            stroke="#b87b5a"
            strokeWidth="1.8"
          />
          <path
            d="M805 536C791 531 780 541 770 558L750 588C741 601 746 615 757 621C769 628 782 621 792 608L822 565C832 551 820 540 805 536Z"
            fill="url(#v4-under-finger)"
            stroke="#b87b5a"
            strokeWidth="1.8"
          />
          <path
            d="M851 561C839 555 827 565 818 581L802 608C794 622 800 635 811 641C824 648 837 637 845 624L869 586C878 572 866 565 851 561Z"
            fill="url(#v4-under-finger)"
            stroke="#b87b5a"
            strokeWidth="1.8"
          />
          <path
            d="M891 588C880 584 870 592 863 605L852 624C846 635 850 646 860 651C871 657 883 647 889 635L905 610C912 599 904 592 891 588Z"
            fill="url(#v4-under-finger)"
            stroke="#b87b5a"
            strokeWidth="1.8"
          />
          <path
            d="M750 519C757 516 766 522 769 528C772 534 765 544 760 550C756 555 745 550 740 545C736 541 741 527 750 519Z"
            fill="#ffe2cb"
            stroke="#d39b7c"
            strokeWidth="1.3"
          />
          <path
            d="M795 544C802 541 812 546 815 553C817 558 809 570 804 576C799 581 789 577 784 572C781 568 786 551 795 544Z"
            fill="#ffe2cb"
            stroke="#d39b7c"
            strokeWidth="1.3"
          />
          <path
            d="M842 570C849 568 857 573 860 579C862 584 855 596 850 601C846 606 836 602 833 597C830 592 835 577 842 570Z"
            fill="#ffe2cb"
            stroke="#d39b7c"
            strokeWidth="1.3"
          />
          <path
            d="M884 596C890 594 898 599 899 604C901 608 896 618 892 622C887 626 880 622 877 618C875 614 879 601 884 596Z"
            fill="#ffe2cb"
            stroke="#d39b7c"
            strokeWidth="1.3"
          />
          {/* Dark top thumb crosses the light palm as in the supplied reference. */}
          <path
            d="M1095 357C1057 356 1018 340 979 321C963 312 946 310 928 315L853 337C838 342 832 351 827 366L799 397C789 408 793 421 806 427C820 434 837 429 849 419C866 404 878 389 882 370L914 358C945 351 970 352 991 367C1016 384 1031 405 1040 426C1063 430 1086 416 1100 397Z"
            fill="url(#v4-bronze)"
          />
          <path
            d="M812 381C820 376 832 381 838 388C842 392 837 402 831 409C825 416 812 413 804 408L795 403C799 394 804 386 812 381Z"
            fill="#ffe2c9"
            stroke="#d39b7c"
            strokeWidth="1.3"
          />
          <path
            d="M882 367C887 381 886 392 882 401M936 344C935 357 929 368 921 376"
            stroke="#ba7958"
            strokeOpacity=".55"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
        {/* Purposefully tapered purple sleeve with a narrow white cuff. */}
        <g className="handshake-v4-left">
          <path
            d="M619 330L666 346L624 530L580 515Z"
            fill="#faf7ff"
            stroke="#e5daef"
            strokeWidth="1.6"
          />
          <path
            d="M487 281L618 318C630 321 635 330 631 344L587 535C584 549 577 556 565 552L445 517C434 514 431 507 434 494L474 298C476 286 479 279 487 281Z"
            fill="url(#v4-purple)"
          />
          <path
            d="M609 330C596 369 581 440 569 521"
            stroke="#b57ae9"
            strokeWidth="3.3"
            strokeLinecap="round"
          />
          <path
            d="M488 299L594 331M481 312L588 344"
            stroke="#bc8bea"
            strokeOpacity=".28"
            strokeWidth="2"
          />
          <circle
            cx="534"
            cy="491"
            r="10"
            fill="#d7baf4"
            stroke="#f2e9ff"
            strokeWidth="1.5"
          />
          <circle
            cx="562"
            cy="502"
            r="9.5"
            fill="#d7baf4"
            stroke="#f2e9ff"
            strokeWidth="1.5"
          />
        </g>
        <g className="handshake-v4-right">
          <path
            d="M1168 341L1201 329L1242 505L1205 520Z"
            fill="#fcfaff"
            stroke="#dbc8ef"
            strokeWidth="1.8"
          />
          <path
            d="M1200 318L1323 288C1335 285 1343 293 1346 305L1380 475C1383 488 1378 495 1366 499L1244 532C1233 535 1226 529 1223 517L1188 338C1186 328 1190 321 1200 318Z"
            fill="url(#v4-white)"
            stroke="#e0d2ee"
            strokeWidth="1.6"
          />
          <path
            d="M1203 331L1239 513"
            stroke="#b99cde"
            strokeWidth="2.7"
            strokeLinecap="round"
          />
          <path
            d="M1221 337L1319 313M1225 352L1323 329"
            stroke="#d7c5e9"
            strokeOpacity=".5"
            strokeWidth="1.8"
          />
          <circle
            cx="1262"
            cy="496"
            r="8"
            fill="#d7c2ee"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </g>
      </g>
      <path
        className="handshake-v4-orbit"
        d="M469 609C421 679 565 701 794 627C1028 553 1225 450 1339 344"
        stroke="url(#v4-orbit)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
