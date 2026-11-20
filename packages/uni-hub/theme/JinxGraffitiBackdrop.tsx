import React from 'react';
import styles from './JinxGraffitiBackdrop.module.scss';

export const JinxGraffitiBackdrop = (): React.ReactElement => {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <text
          x="640"
          y="82"
          fontSize="30"
          className={styles.quoteBlue}
          transform="rotate(-5 640 82)"
        >
          <tspan x="640" dy="0">
            RULES ARE MADE
          </tspan>
          <tspan x="662" dy="34">
            TO BE BROKEN...
          </tspan>
        </text>
        <text
          x="64"
          y="286"
          fontSize="24"
          className={styles.quoteLime}
          transform="rotate(-7 64 286)"
        >
          <tspan x="64" dy="0">
            JINX?
          </tspan>
          <tspan x="78" dy="28">
            STANDS FOR JINX!
          </tspan>
        </text>
        <text
          x="1265"
          y="474"
          fontSize="22"
          className={styles.quotePink}
          transform="rotate(5 1265 474)"
        >
          <tspan x="1265" dy="0">
            I&apos;M CRAZY!
          </tspan>
          <tspan x="1240" dy="26">
            GOT A DOCTOR&apos;S NOTE.
          </tspan>
        </text>
        <text
          x="268"
          y="714"
          fontSize="22"
          className={styles.quoteBlue}
          transform="rotate(-4 268 714)"
        >
          <tspan x="268" dy="0">
            STAND STILL!
          </tspan>
          <tspan x="254" dy="26">
            I&apos;M TRYING TO SHOOT YOU!
          </tspan>
        </text>
        <text
          x="1245"
          y="598"
          fontSize="22"
          className={styles.quoteViolet}
          transform="rotate(6 1245 598)"
        >
          <tspan x="1245" dy="0">
            SAY HELLO
          </tspan>
          <tspan x="1230" dy="26">
            TO MY FRIENDS!
          </tspan>
        </text>
      </svg>
    </div>
  );
};
