import { classes, css } from './style.module.css';
import { insertStyleElement } from 'bun-style-plugin/utils';

insertStyleElement(css);

console.dir('Styles loaded:', classes);
