# SupaHTML
Supercharged HTML Parser

## Usage
```javascript
import { parseHTML } from 'supa-html';

const html = `<p>Hello world</p>`;

const tree = parseHTML(html);

console.log(tree);
```