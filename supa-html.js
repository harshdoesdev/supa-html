const createTag = (tagName, parent = null, attributes = null) => {
    return {
        tagName,
        parent,
        attributes,
        children: []
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
        } else if(curr === '=') {
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

    const ROOT = createTag('ROOT');

    let tag = ROOT;

    let tagName = '', text = '', attributeString = '';

    let isClosingTag = false;

    let tagNameOpen = false, hasAttributes = false, tagOpen = true, q = '', strOpen = false;

    let tagStrOpen = '';

    while(i < chars.length) {
        const curr = chars[i];

        if(hasAttributes && (curr === '"' || curr === "'")) {
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
        } else if(curr === '<') {
            if(chars[i + 1] === '/') {
                isClosingTag = true;
                i++;
            } else {
                if(tagOpen) {
                    tag.children.push(text);
                    text = '';
                }

                tagOpen = true;
            }

            tagNameOpen = true;
        } else if(curr === '>') {
            if(isClosingTag) {
                if(text) {
                    tag.children.push(text);
                    text = '';
                }

                if(tagName === tag.tagName) {
                    tag = tag.parent;
                }
                
                isClosingTag = false;   

                tagOpen = false;
            } else {
                if(/script|style/.test(tagName)) {
                    throw new Error(`${tagName} is not allowed.`);
                }

                const parent = tag;

                tag = createTag(
                    tagName, 
                    parent, 
                    parseAttributes(attributeString)
                );

                parent.children.push(tag);
            }

            tagNameOpen = false;
            hasAttributes = false;
            attributeString = '';
            tagName = '';
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

    return ROOT;
}

export default function html(strings, ...values) {
    const input = values.reduce(
        (string, value, index) => string + value + strings[index + 1], 
        strings[0]
    );

    return parseHTML(input);
}
