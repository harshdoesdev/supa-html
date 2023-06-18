var SELF_CLOSING_TAGS_RGX = /^(br|img|input|source|wbr|hr|col|area|embed|track)$/;
var SVG_TAGS_RGX = /^(animate|animateMotion|animateTransform|circle|clipPath|defs|desc|discard|ellipse|feBlend|feColorMatrix|feComponentTransfer|feComposite|feConvolveMatrix|feDiffuseLighting|feDisplacementMap|feDistantLight|feDropShadow|feFlood|feFuncA|feFuncB|feFuncG|feFuncR|feGaussianBlur|feImage|feMerge|feMergeNode|feMorphology|feOffset|fePointLight|feSpecularLighting|feSpotLight|feTile|feTurbulence|filter|foreignObject|g|image|line|linearGradient|marker|mask|metadata|mpath|path|pattern|polygon|polyline|radialGradient|rect|set|stop|svg|switch|symbol|text|textPath|tspan|unknown|use|view)$/;
var PLAIN_TEXT_TAGS_RGX = /^(textarea|style|script)$/;
var COMMENT_BEGIN = '!--';
var WHITE_SPACE_RGX = /\s+/;
var OP = {
    DOUBLE_QUOTE: '"',
    SINGLE_QUOTE: "'",
    ANGLE_BRACKET_OPEN: '<',
    ANGLE_BRACKET_CLOSE: '>',
    MINUS: '-',
    SLASH: '/',
    MULTIPLY: '*',
    EQUAL: '=',
    BACKTICK: '`',
    BRACE_OPEN: '{',
    BRACE_CLOSE: '}',
    ESCAPE: '\\'
};
var NODE_TYPE = {
    TEXT: '#text',
    DOCUMENT_FRAGMENT: '#document-fragment',
    INTERPOLATION: '#interpolation'
};
var isWhiteSpace = function (v) { return WHITE_SPACE_RGX.test(v); };
var isSelfClosingTag = function (v) { return SELF_CLOSING_TAGS_RGX.test(v); };
var isSvgTag = function (v) { return SVG_TAGS_RGX.test(v); };
var createTag = function (type, parent, props, isSvg) {
    if (parent === void 0) { parent = null; }
    if (props === void 0) { props = {}; }
    if (isSvg === void 0) { isSvg = false; }
    return {
        type: type,
        isSvg: isSvg,
        parent: parent,
        props: props,
        children: []
    };
};
var createText = function (value) {
    return {
        type: NODE_TYPE.TEXT,
        value: value
    };
};
var createDocFrag = function (parent, isSvg) {
    if (parent === void 0) { parent = null; }
    if (isSvg === void 0) { isSvg = false; }
    return createTag(NODE_TYPE.DOCUMENT_FRAGMENT, parent, null, isSvg);
};
var createInteroplation = function (value) {
    return {
        type: NODE_TYPE.INTERPOLATION,
        value: value.trim()
    };
};
var parseAttributes = function (str) {
    var chars = str.split('');
    var attributes = {};
    var i = 0;
    var value = '', key = '', strOpen = false, escapeSequence = false, q = '';
    var reset = function () {
        key = '';
        value = '';
    };
    var setAttr = function (key, value) {
        attributes[key] = value;
        reset();
    };
    while (i < chars.length) {
        var curr = chars[i];
        if (curr === OP.ESCAPE) {
            escapeSequence = true;
        }
        if ((curr === ' ' || curr === '\n') && !strOpen) {
            if (key) {
                setAttr(key, value);
            }
        }
        else if (curr === OP.DOUBLE_QUOTE || curr === OP.SINGLE_QUOTE) {
            if (strOpen) {
                if (q === curr && !escapeSequence) {
                    strOpen = false;
                    if (key) {
                        setAttr(key, value);
                        q = '';
                    }
                }
                else {
                    value += curr;
                    escapeSequence = false;
                }
            }
            else {
                q = curr;
                strOpen = true;
            }
        }
        else if (curr === OP.EQUAL && !strOpen) {
            key = value;
            value = '';
        }
        else {
            value += curr;
        }
        i++;
    }
    if (value || key) {
        if (!key && value) {
            key = value;
            value = undefined;
        }
        setAttr(key, value);
    }
    return attributes;
};
export function parseHTML(html, allowScripts) {
    if (allowScripts === void 0) { allowScripts = false; }
    var chars = html.split('');
    var frag = createDocFrag();
    var tag = frag;
    var i = 0;
    var type = '', text = '', attributeString = '', isClosingTag = false, tagNameOpen = false, hasAttributes = false, tagOpen = true, q = '', commentOpen = false, strOpen = false, escapeSequence = false, isPlainText = false, lastTag = '', tagStrOpen = '', jsSingleLineCommment = false, jsMultiLineComment = false, jsStrOpen = false;
    while (i < chars.length) {
        var curr = chars[i];
        var next = chars[i + 1];
        if (isPlainText) {
            if (tag.type === 'script' && curr === OP.ESCAPE) {
                escapeSequence = true;
                text += curr;
            }
            else if (tag.type === 'script' &&
                curr === OP.SLASH &&
                next === OP.SLASH &&
                !jsSingleLineCommment &&
                !jsMultiLineComment) {
                jsSingleLineCommment = true;
                i++;
            }
            else if ((tag.type === 'script' || tag.type === 'style') &&
                curr === OP.SLASH &&
                next === OP.MULTIPLY &&
                !jsMultiLineComment &&
                !jsSingleLineCommment) {
                jsMultiLineComment = true;
                i++;
            }
            else if (jsMultiLineComment &&
                curr === OP.MULTIPLY &&
                next === OP.SLASH) {
                jsMultiLineComment = false;
                i++;
            }
            else if (curr === '\n' && jsSingleLineCommment) {
                jsSingleLineCommment = false;
            }
            else if (jsSingleLineCommment || jsMultiLineComment) {
                // -------
            }
            else if (tag.type === 'script' &&
                (curr === OP.DOUBLE_QUOTE ||
                    curr === OP.SINGLE_QUOTE ||
                    curr === OP.BACKTICK)) {
                text += curr;
                if (jsStrOpen) {
                    if (q === curr && !escapeSequence) {
                        jsStrOpen = false;
                        q = '';
                    }
                    else {
                        escapeSequence = false;
                    }
                }
                else {
                    jsStrOpen = true;
                    q = curr;
                }
            }
            else if (curr === OP.ANGLE_BRACKET_OPEN &&
                next === OP.SLASH &&
                !jsStrOpen) {
                var temp = '';
                var j = i + 2;
                while (j < chars.length) {
                    var c = chars[j];
                    if (c === OP.ANGLE_BRACKET_CLOSE) {
                        break;
                    }
                    temp += c;
                    j++;
                }
                if (temp.trim() === tag.type) {
                    isPlainText = false;
                    i = i - 1;
                }
                else {
                    text += "</".concat(temp, ">");
                    i = j;
                }
            }
            else {
                text += curr;
            }
        }
        else if (commentOpen) {
            if (curr === OP.ANGLE_BRACKET_CLOSE &&
                chars[i - 1] === OP.MINUS &&
                chars[i - 2] === OP.MINUS) {
                commentOpen = false;
            }
        }
        else if (curr === OP.ESCAPE && hasAttributes) {
            attributeString += OP.ESCAPE;
            escapeSequence = true;
        }
        else if (hasAttributes && (curr === OP.DOUBLE_QUOTE || curr === OP.SINGLE_QUOTE)) {
            attributeString += curr;
            if (strOpen) {
                if (q === curr && !escapeSequence) {
                    strOpen = false;
                }
                else {
                    escapeSequence = false;
                }
            }
            else {
                q = curr;
                strOpen = true;
                tagStrOpen = type;
            }
        }
        else if (hasAttributes && strOpen) {
            attributeString += curr;
        }
        else if (curr === OP.BRACE_OPEN && next === OP.BRACE_OPEN) {
            if (text) {
                var textNode = createText(text);
                tag.children.push(textNode);
                text = '';
            }
            var value = '';
            i += 2;
            while (i < chars.length) {
                var c = chars[i];
                if (c === OP.BACKTICK && !strOpen) {
                    throw new Error("Template Literals are not allowed in interpolations.");
                }
                if (c === OP.DOUBLE_QUOTE ||
                    c === OP.SINGLE_QUOTE) {
                    value += c;
                    if (strOpen) {
                        if (q === c && !escapeSequence) {
                            value += text;
                            strOpen = false;
                            q = '';
                            text = '';
                        }
                        else {
                            text += c;
                        }
                    }
                    else {
                        strOpen = true;
                        q = c;
                    }
                }
                else if (c === OP.BRACE_CLOSE &&
                    chars[i + 1] === OP.BRACE_CLOSE &&
                    !strOpen) {
                    i++;
                    break;
                }
                else {
                    value += c;
                }
                i++;
            }
            value = value.trim();
            var interp = createInteroplation(value);
            if (!interp.value) {
                throw new Error("Interpolation can't be empty.");
            }
            tag.children.push(interp);
        }
        else if (curr === OP.ANGLE_BRACKET_CLOSE && tagNameOpen) {
            if (text) {
                var textNode = createText(text);
                tag.children.push(textNode);
                text = '';
            }
            if (isClosingTag) {
                if (lastTag === tag.type && tag !== frag) {
                    tag = tag.parent;
                    lastTag = tag.type;
                }
                isClosingTag = false;
                tagOpen = false;
            }
            else {
                type = type.toLowerCase();
                if (type === 'script' && !allowScripts) {
                    throw new Error('<script> tag is not allowed');
                }
                if (type === COMMENT_BEGIN) {
                    commentOpen = true;
                }
                else {
                    var parent_1 = tag;
                    var isSvg = isSvgTag(type);
                    var createdTag = type === ''
                        ? createDocFrag(parent_1, isSvg)
                        : createTag(type, parent_1, parseAttributes(attributeString), isSvg || parent_1.isSvg);
                    parent_1.children.push(createdTag);
                    if (!isSelfClosingTag(type)) {
                        tag = createdTag;
                    }
                    if (PLAIN_TEXT_TAGS_RGX.test(type)) {
                        isPlainText = true;
                        if (next === '\n') {
                            i++;
                        }
                    }
                    lastTag = type;
                }
            }
            tagNameOpen = false;
            hasAttributes = false;
            attributeString = '';
            type = '';
        }
        else if (curr === OP.ANGLE_BRACKET_OPEN) {
            if (isWhiteSpace(next)) {
                text += curr;
            }
            else {
                if (next === OP.SLASH) {
                    isClosingTag = true;
                    i++;
                }
                else {
                    if (tagOpen) {
                        var textNode = createText(text);
                        tag.children.push(textNode);
                        text = '';
                    }
                    if (!isSelfClosingTag(tag.type)) {
                        tagOpen = true;
                    }
                }
                tagNameOpen = true;
            }
        }
        else if (tagNameOpen) {
            if (!hasAttributes) {
                if (isWhiteSpace(curr)) {
                    hasAttributes = true;
                }
                else {
                    type += curr;
                }
            }
            else {
                attributeString += curr;
            }
        }
        else if (!isClosingTag) {
            text += curr;
        }
        i++;
    }
    if (strOpen) {
        throw new Error("Unexpected `".concat(q, "`."));
    }
    return frag;
}
