import {
  css,
  classes,
  injectedStyles,
  injectStyles,
  ejectStyles,
} from "./style_first.css";
import def from "./style_second.css";

console.dir(
  "Styles loaded:\n",
  css,
  classes,
  injectedStyles,
  injectStyles,
  ejectStyles,
);
console.dir("Styles loaded2:\n", def);
