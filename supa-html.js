const SELF_CLOSING_TAGS_RGX = /br|img|input|source|wbr|hr|col|area|embed|track/;

const SVG_TAGS_RGX = /animate|animateMotion|animateTransform|circle|clipPath|defs|desc|discard|ellipse|feBlend|feColorMatrix|feComponentTransfer|feComposite|feConvolveMatrix|feDiffuseLighting|feDisplacementMap|feDistantLight|feDropShadow|feFlood|feFuncA|feFuncB|feFuncG|feFuncR|feGaussianBlur|feImage|feMerge|feMergeNode|feMorphology|feOffset|fePointLight|feSpecularLighting|feSpotLight|feTile|feTurbulence|filter|foreignObject|g|image|line|linearGradient|marker|mask|metadata|mpath|path|pattern|polygon|polyline|radialGradient|rect|set|stop|svg|switch|symbol|text|textPath|tspan|unknown|use|view/;

const TEXT = '#text';

const DOCUMENT_FRAGMENT = '#document-fragment';

const COMMENT_BEGIN = '!--';

const NOT_ALLOWED_TAGS_RGX = /script|style/;

const WHITE_SPACE_RGX = /\s+/;

const isWhiteSpace = v => {
    return WHITE_SPACE_RGX.test(v);
};

const isSelfClosingTag = v => SELF_CLOSING_TAGS_RGX.test(v);

const isSvgTag = v => SVG_TAGS_RGX.test(v) && v !== 'img';

const createTag = (tagName, parent = null, attributes = null, isSvg = false) => {
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

const parseAttributes = str => {
    const chars = str.split('');

    const attributes = {};

    let i = 0;

    let value = '', key = '', strOpen = false, q = '';

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

        if((curr === ' ' || curr === '\n') && !strOpen ) {
            if(key) {
                setAttr(key, value);
            }
        } else if(curr === '"' || curr === "'") {
            if(strOpen) {
                if(q === curr) {
                    strOpen = false;

                    if(key) {
                        setAttr(key, value);
                        q = '';
                    }
                }
            } else {
                q = curr;
                strOpen = true;
            }
        } else if(curr === '=' && !strOpen) {
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

    let i = 0;

    const FRAGMENT = createDocFrag();

    let tag = FRAGMENT;

    let tagName = '', text = '', attributeString = '';

    let isClosingTag = false;

    let tagNameOpen = false, 
        hasAttributes = false, 
        tagOpen = true, 
        q = '', 
        commentOpen = false,
        strOpen = false;

    let tagStrOpen = '';

    while(i < chars.length) {
        const curr = chars[i];

        if(commentOpen) {
            if(curr === '>' && chars[i - 1] === '-' && chars[i - 2] === '-') {
                commentOpen = false;
            }
        } else if(hasAttributes && (curr === '"' || curr === "'")) {
            attributeString += curr;

            if(strOpen) {
                if(q === curr) {
                    strOpen = false;
                }
            } else {
                q = curr;
                strOpen = true;
                tagStrOpen = tagName;
            }
        } else if(hasAttributes && strOpen) {
            attributeString += curr;
        } else if(curr === '>' && tagNameOpen) {
            if(isClosingTag) {
                if(text) {
                    const textNode = createText(text);

                    tag.children.push(textNode);
                    text = '';
                }

                if(tagName === tag.tagName) {
                    tag = tag.parent;
                }
                
                isClosingTag = false;   

                tagOpen = false;
            } else {
                if(NOT_ALLOWED_TAGS_RGX.test(tagName)) {
                    throw new Error(`${tagName} is not allowed.`);
                }

                if(tagName === COMMENT_BEGIN) {
                    commentOpen = true;
                } else {
                    const parent = tag;

                    tagName = tagName.toLowerCase();

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
    
                    if(!isSelfClosingTag(createdTag.tagName)) {
                        tag = createdTag;
                    }
                }
            }

            tagNameOpen = false;
            hasAttributes = false;
            attributeString = '';
            tagName = '';
        } else if(curr === '<') {
            if(isWhiteSpace(chars[i + 1])) {
                text += curr;
            } else {
                if(chars[i + 1] === '/') {
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
                if(curr === ' ') {
                    hasAttributes = true;
                } else if(curr === '\n') {
                    
                } else {
                    tagName += curr;
                }
            } else {
                attributeString += curr;
            }
        } else if(tagOpen && !isClosingTag) {
            text += curr;
        }

        i++;
    }

    if(strOpen) {
        throw new Error(`Attribute quote open in <${tagStrOpen}> tag.`);
    }

    return FRAGMENT;
}
