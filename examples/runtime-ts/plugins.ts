import { plugin } from 'bun';
import { styleLoader } from 'bun-scss-loader';

await plugin(styleLoader({
  targets: ['chrome 80', 'mozilla 80', 'safari 14', 'ie 11'],
}));
