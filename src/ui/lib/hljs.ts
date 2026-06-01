// src/ui/lib/hljs.ts
//
// highlight.js 를 "core + 필요한 언어만" 등록해 번들을 작게 유지한다.
// (전체 'highlight.js' 를 import 하면 모든 언어가 들어와 번들이 ~1MB 커진다.)

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';
import c from 'highlight.js/lib/languages/c';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('c', c);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);

export default hljs;
