# Small and fast CSS matcher

The goal for this project is to quickly find edges of selector or property in CSS/LESS/SCSS source code:

```js
import match from '@emmetio/css-matcher';

const content = '.foo { padding: 10px } .bar { margin: 20px }';

// Finds matched CSS selector at character position 2
const data = match(content, 2);

console.log(data.type); // Type of match: 'selector'
console.log(tag.start); // Location of match start: 0
console.log(tag.end); // Location of match emd: 22
```

Matcher searches `content` for a context match closest to given `location` and, if found, returns object with the following properties:

* `type`: type of matched section, either `selector` or property;
* `start`: character location where match starts;
* `end`: character location where match end, for `selector` it will be right after `}`, for property it will be right after `;` or property value;
* `bodyStart`: location there body of the match starts. For `selector` it will be right after `{`, for `property` it will be a beginning of the property value.
* `bodyEnd`: location there body of the match ends. For `selector` it will be right before `}`, for `property` it will be an end of the property value.
