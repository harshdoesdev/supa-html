# SupaHTML
Supercharged HTML Parser

## Usage
```javascript
// const { parseHTML } = require('supa-html');
import { parseHTML } from 'supa-html';

const html = `<p>Hello world</p>`;

const tree = parseHTML(html);

console.log(tree);
```