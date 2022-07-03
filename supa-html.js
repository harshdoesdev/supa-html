const SELF_CLOSING_TAGS_RGX = /^(br|img|input|source|wbr|hr|col|area|embed|track)$/;

const SVG_TAGS_RGX = /^(animate|animateMotion|animateTransform|circle|clipPath|defs|desc|discard|ellipse|feBlend|feColorMatrix|feComponentTransfer|feComposite|feConvolveMatrix|feDiffuseLighting|feDisplacementMap|feDistantLight|feDropShadow|feFlood|feFuncA|feFuncB|feFuncG|feFuncR|feGaussianBlur|feImage|feMerge|feMergeNode|feMorphology|feOffset|fePointLight|feSpecularLighting|feSpotLight|feTile|feTurbulence|filter|foreignObject|g|image|line|linearGradient|marker|mask|metadata|mpath|path|pattern|polygon|polyline|radialGradient|rect|set|stop|svg|switch|symbol|text|textPath|tspan|unknown|use|view)$/;

const PLAIN_TEXT_TAGS_RGX = /^(textarea|style|script)$/;

const TEXT = '#text';

const DOCUMENT_FRAGMENT = '#document-fragment';

const INTERPOLATION = '#interpolation';

const COMMENT_BEGIN = '!--';

const WHITE_SPACE_RGX = /\s+/;

const OP = {
    DOUBLE_QUOTE: '"',
    SINGLE_QUOTE: "'",
    ANGLE_BRACKET_OPEN: '<',
    ANGLE_BRACKET_CLOSE: '>',
    MINUS: '-',
    SLASH: '/',
    EQUAL: '=',
    BACKTICK: '`',
    BRACKET_OPEN: '{',
    BRACKET_CLOSE: '}',
    ESCAPE: '\\'
};

const isWhiteSpace = v => {
    return WHITE_SPACE_RGX.test(v);
};

const isSelfClosingTag = v => SELF_CLOSING_TAGS_RGX.test(v);

const isSvgTag = v => SVG_TAGS_RGX.test(v);

const createTag = (tagName, parent = null, attributes = {}, isSvg = false) => {
    return {
        tagName,
        isSvg,
        parent,
        attributes,
        children: []
    }
};

const createText = value => {
    return {
        tagName: TEXT,
        value
    }
};

const createDocFrag = (parent = null) => {
    return {
        tagName: DOCUMENT_FRAGMENT,
        children: [],
        parent
    }
};

const createInteroplation = value => {
    return {
        tagName: INTERPOLATION,
        value: value.trim()
    }
};

const parseAttributes = str => {
    const chars = str.split('');

    const attributes = {};

    let i = 0;

    let value = '', 
        key = '', 
        strOpen = false, 
        escapeSequence = false, 
        q = '';

    const reset = () => {
        key = '';
        value = '';
    };

    const setAttr = (key, value) => {
        attributes[key] = value;
        reset();
    };

    while(i < chars.length) {
        const curr = chars[i];

        if(curr === OP.ESCAPE) {
            escapeSequence = true;
        } if((curr === ' ' || curr === '\n') && !strOpen ) {
            if(key) {
                setAttr(key, value);
            }
        } else if(curr === OP.DOUBLE_QUOTE || curr === OP.SINGLE_QUOTE) {
            if(strOpen) {
                if(q === curr && !escapeSequence) {
                    strOpen = false;

                    if(key) {
                        setAttr(key, value);
                        q = '';
                    }
                } else {
                    value += curr;
                    escapeSequence = false;
                }
            } else {
                q = curr;
                strOpen = true;
            }
        } else if(curr === OP.EQUAL && !strOpen) {
            key = value;
            value = '';
        } else {
            value += curr;
        }

        i++;
    }

    if(value || key) {
        if(!key && value) {
            key = value;
            value = undefined;
        }

        setAttr(key, value);
    }

    return attributes;
};

export function parseHTML(html) {
    const chars = html.split('');

    const FRAGMENT = createDocFrag();

    let tag = FRAGMENT;

    let i = 0;

    let tagName = '', 
        text = '', 
        attributeString = '',
        isClosingTag = false,
        tagNameOpen = false, 
        hasAttributes = false, 
        tagOpen = true, 
        q = '', 
        commentOpen = false,
        strOpen = false,
        escapeSequence = false,
        isPlainText = false,
        lastTag = '',
        tagStrOpen = '';

    while(i < chars.length) {
        const curr = chars[i];
        const next = chars[i + 1];

        if(isPlainText) {
            if(curr === OP.ANGLE_BRACKET_OPEN && next === OP.SLASH) {
                let temp = '';

                let j = i + 2;

                while(j < chars.length) {
                    const c = chars[j];

                    if(c === OP.ANGLE_BRACKET_CLOSE) {
                        break;
                    }

                    temp += c;

                    j++;
                }

                if(temp.trim() === tag.tagName) {
                    isPlainText = false;
                    i = i - 1;
                } else {
                    text += `</${temp}>`;
                    i = j;
                }
            } else {
                text += curr;
            }
        } else if(commentOpen) {
            if(
                curr === OP.ANGLE_BRACKET_CLOSE && 
                chars[i - 1] === OP.MINUS && 
                chars[i - 2] === OP.MINUS
            ) {
                commentOpen = false;
            }
        } else if(curr === OP.ESCAPE && hasAttributes) {
            attributeString += OP.ESCAPE;
            escapeSequence = true;
        } else if(hasAttributes && (curr === OP.DOUBLE_QUOTE || curr === OP.SINGLE_QUOTE)) {
            attributeString += curr;

            if(strOpen) {
                if(q === curr && !escapeSequence) {
                    strOpen = false;
                } else {
                    escapeSequence = false;
                }
            } else {
                q = curr;
                strOpen = true;
                tagStrOpen = tagName;
            }
        } else if(hasAttributes && strOpen) {
            attributeString += curr;
        } else if(curr === OP.BRACKET_OPEN && next === OP.BRACKET_OPEN) {
            if(text) {
                const textNode = createText(text);

                tag.children.push(textNode);
                text = '';
            }

            let value = '';

            i += 2;

            while(i < chars.length) {
                const c = chars[i];

                if(c === OP.BACKTICK && !strOpen) {
                    throw new Error(
                        `Template Literals are not allowed in interpolations.`
                    )
                }

                if(
                    c === OP.DOUBLE_QUOTE || 
                    c === OP.SINGLE_QUOTE
                ) {
                    value += c;

                    if(strOpen) {
                        if(q === c && !escapeSequence) {
                            value += text;
                            strOpen = false;
                            q = '';
                            text = '';
                        } else {
                            text += c;
                        }
                    } else {
                        strOpen = true;
                        q = c;
                    }
                } else if(
                    c === OP.BRACKET_CLOSE && 
                    chars[i + 1] === OP.BRACKET_CLOSE && 
                    !strOpen
                ) {
                    i++;
                    break;
                } else {
                    value += c;
                }
                
                i++;
            }
            
            value = value.trim();

            const interp = createInteroplation(value);

            if(!interp.value) {
                throw new Error("Interpolation can't be empty.");
            }

            tag.children.push(interp);
        } else if(curr === OP.ANGLE_BRACKET_CLOSE && tagNameOpen) {
            if(text) {
                const textNode = createText(text);

                tag.children.push(textNode);
                text = '';
            }

            if(isClosingTag) {
                if(lastTag === tag.tagName) {
                    tag = tag.parent;
                }
                
                isClosingTag = false;   

                tagOpen = false;

                lastTag = '';
            } else {
                tagName = tagName.toLowerCase();

                if(tagName === 'script') {
                    throw new Error(`<script> tag is not allowed.`);
                }

                if(tagName === COMMENT_BEGIN) {
                    commentOpen = true;
                } else {
                    const parent = tag;

                    const isSvg = isSvgTag(tagName);
    
                    const createdTag = tagName === ''
                        ? createDocFrag(parent)
                        : createTag(
                            tagName, 
                            parent, 
                            parseAttributes(attributeString),
                            isSvg || parent.isSvg
                        );
    
                    parent.children.push(createdTag);
    
                    if(!isSelfClosingTag(tagName)) {
                        tag = createdTag;
                    }

                    if(PLAIN_TEXT_TAGS_RGX.test(tagName)) {
                        isPlainText = true;
                    }

                    lastTag = tagName;
                }
            }

            tagNameOpen = false;
            hasAttributes = false;
            attributeString = '';
            tagName = '';
        } else if(curr === OP.ANGLE_BRACKET_OPEN) {
            if(isWhiteSpace(next)) {
                text += curr;
            } else {
                if(next === OP.SLASH) {
                    isClosingTag = true;
                    i++;
                } else {
                    if(tagOpen) {
                        const textNode = createText(text);
    
                        tag.children.push(textNode);
                        text = '';
                    }
    
                    if(!isSelfClosingTag(tag.tagName)) {
                        tagOpen = true;
                    }
                }
    
                tagNameOpen = true;
            }
        } else if(tagNameOpen) {
            if(!hasAttributes) {
                if(isWhiteSpace(curr)) {
                    hasAttributes = true;
                } else {
                    tagName += curr;
                }
            } else {
                attributeString += curr;
            }
        } else if(!isClosingTag) {
            text += curr;
        }

        i++;
    }

    if(strOpen) {
        throw new Error(`Unexpected \`${q}\`.`);
    }

    return FRAGMENT;
}
