import df, { classes, css } from './style.module.css';
import { insertCssIntoDom } from 'bun-style-plugin/utils';
insertCssIntoDom(css);

console.dir('Styles loaded:', df);
