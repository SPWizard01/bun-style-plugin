import styles, { code } from './style.module.css';
import { insertStyleElement } from 'bun-style-plugin/utils';

insertStyleElement(code);

console.dir('Styles loaded:', styles);
