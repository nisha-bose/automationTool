


var configObj = {
    tags: []
}



function getPathTo(element) {
    if (element.id !== '')
        return "//*[@id='" + element.id + "']";

    if (element === document.body)
        return element.tagName.toLowerCase();

    var ix = 0;
    var siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];

        if (sibling === element) return getPathTo(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';

        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }

}
function getPathToRefine(path) {
    if (path[0] != '/' && path[1] != '/')
        return '//' + path;
    return path;

}

function getLocator(element) {
    var xpath = getPathToRefine(getPathTo(element));
    // console.log("xpath:"+xpath+", refined:"+getPathToRefine(xpath));
    var locator = [];
    if (!!element.getAttribute("id"))
        locator.push('"id" : "' + element.getAttribute("id") + '"');
    if (!!element.getAttribute("name"))
        locator.push('"name" : "' + element.getAttribute("name") + '"');
    locator.push('"xpath" : "' + xpath + '"');
    return locator.join(',');
}

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}




// function textInput(element,value,auto){
//     console.log(getLocator(element));
//     return '\n{\n\t"type"     : "textEntry",\n\t"optional" : false,\n\t"param"    : \n\t\t\t{\n\t\t\t\t"locator" :{ '+getLocator(element)+'},\n\t\t\t\t"value"   : "'+value+'"\n\t\t\t} ,\n\t"auto"    :  '+auto+'\n}';
//   }
// function elementClick(element,auto){
//     console.log(getLocator(element));
//     return '\n{\n\t"type" : "elementClick",\n\t"optional" : false,\n\t"param" : \n\t\t\t{\n\t\t\t\t"locator" :{ '+getLocator(element)+'}},\n\t"auto" : '+auto+'\n}';
// }
function textInput(element, value) {
    console.log(getLocator(element));
    return JSON.parse('{"type":"textInput",\n"locator":{' + getLocator(element) + '},\n"auto":' + true + ',"enabled":false,"value":""}');
}
function elementClick(element) {
    console.log(getLocator(element));
    return JSON.parse('{"type":"elementClick",\n"locator":{ ' + getLocator(element) + '},\n"auto":' + true + ',"enabled":false}');
}
function dropDownClick(element) {
    console.log(getLocator(element));
    return JSON.parse('{"type":"dropDownClick",\n"locator":{ ' + getLocator(element) + '},\n"auto":' + true + ',"enabled":false,"value":""}');
}







function generateInstructions(elements) {
    var instructions = [];
    configObj.tags = [];
    elements.button ? configObj.tags.push("button") : '';
    elements.select ? configObj.tags.push("select") : '';
    elements.input ? (configObj.tags.push("input") && configObj.tags.push("textarea")) : '';
    elements.a ? configObj.tags.push("a") : '';
    debugger;

    // from iFrames


    for (var j = 0; j < document.getElementsByTagName("iframe").length; j++) {

        var localDoc;
        try {
            localDoc = document.getElementsByTagName("iframe")[j].contentWindow.document;
            console.err("iFrame detected, It may work wrongly  : ", localDoc);
            var inputs = localDoc.querySelectorAll(configObj.tags.join(","));

            for (var i = 0; i < inputs.length; i++) {

                switch (inputs[i].getAttribute("type")) {

                    case 'hidden': break;

                    case 'tel':
                    case 'password':
                    case 'number':
                    case 'email':
                    case 'search':
                    case 'url':
                    case 'textarea':
                    case 'text': instructions.push(textInput(inputs[i], 'Ebin', true));
                        break;

                    case 'radio':
                    case 'submit':
                    case 'file':
                    case 'checkbox': instructions.push(elementClick(inputs[i], true));
                        break;
                    case 'select': instructions.push(dropDownClick(inputs[i]));
                        break;

                }
            }
        }
        catch (err) {
            console.log(err.message);
        }




    }


    //   from normal dom

    var inputs = document.querySelectorAll(configObj.tags.join(","));
    //   inputs.push.apply(inputs, document.getElementsByTagName('button'))

    console.log("total inputs are : ", inputs);
    for (var i = 0; i < inputs.length; i++) {

        if ((inputs[i].getAttribute("class") + "").indexOf("hidden") != -1) continue;
        if (inputs[i].style.display == "none") continue;
        if (inputs[i].offsetWidth == 0 || inputs[i].offsetHeight == 0) continue;




        if (!inputs[i].getAttribute("type")) {
            switch (inputs[i].tagName.toLocaleLowerCase()) {
                case 'textarea': instructions.push(textInput(inputs[i], 'Ebin', true));
                    break;
                case 'button':
                case 'a': instructions.push(elementClick(inputs[i], true));
                    break;
                case 'select': instructions.push(dropDownClick(inputs[i]));
                    break;
            }
        }
        else
            switch (inputs[i].getAttribute("type")) {

                case 'hidden': break;

                case 'tel':
                case 'password':
                case 'number':
                case 'email':
                case 'text': instructions.push(textInput(inputs[i], 'Ebin', true));
                    break;

                case 'radio':
                case 'reset':
                case 'submit':
                case 'file':
                case 'checkbox': instructions.push(elementClick(inputs[i], true));
                    break;
            }
    }
    return instructions;
}
var cssTextPrevious = "";
function drawBorder(setFlag, locator) {
    if (locator.id) {
        var el = document.getElementById(locator.id)
        cssTextPrevious = el.style.cssText;
        if (setFlag) {
            el.style.cssText = "outline : 2px solid red !important";
        }
        else
            el.style["outline"] = "";
    } else {
        el = getElementByXpath(locator.xpath);
        cssTextPrevious = el.style.cssText;
        if (setFlag) {
            el.style.cssText = "outline : 2px solid red !important";
        }
        else
            el.style["outline"] = "";
    }
    el.scrollIntoView(false);
    window.scrollBy(0, 250);
}

function setValue(value, locator, dropdownAsText) {
    var el;
    if (locator.id) {
        el = document.getElementById(locator.id);
    } else {
        el = getElementByXpath(locator.xpath);
    }
    if (el.tagName == 'SELECT' && dropdownAsText) {
        debugger;
        var arr = [].slice.call(el.children);
        option = arr.filter(e => {
            if (e.innerText == value)
                return true;
        })[0];
        value=!!option? option.value:'';
    }
    el.value = value;


}

chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        switch (message.type) {
            case "getText":
                sendResponse(generateInstructions(message.elements));
                break;
            case "closed":
                console.log('popup closed.');
                break;
            case "makeBox":
                drawBorder(message.set, message.locator);
                break;
            case "setValue":
                setValue(message.value, message.locator,message.dropdownAsText);
                break;

        }
    }
);

