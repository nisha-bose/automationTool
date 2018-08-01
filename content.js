function getPathTo(element) {
    if (element.id!=='')
        return "//*[@id='"+element.id+"']";
    
    if (element===document.body)
        return element.tagName.toLowerCase();

    var ix= 0;
    var siblings= element.parentNode.childNodes;
    for (var i= 0; i<siblings.length; i++) {
        var sibling= siblings[i];
        
        if (sibling===element) return getPathTo(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        
        if (sibling.nodeType===1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
    
}
function getPathToRefine(path){
if(path[0]!='/' && path[1]!='/')
 return '//'+path;
}

function getLocator(element){
    //console.log(element);
    var locator="";
    if(!element.getAttribute("id")) {
        locator = '"xpath" : "'+getPathTo(element)+'"';
    }
    else locator = '"id" : "'+element.getAttribute("id")+'"';
    return locator;
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
function textInput(element,value,auto){
    console.log(getLocator(element));
    return '\n{\n\t"type"     : "textEntry",\n\t"optional" : false,\n\t"param"    : \n\t\t\t{\n\t\t\t\t"locator" :{ '+getLocator(element)+'},\n\t\t\t\t"value"   : "'+value+'"\n\t\t\t} ,\n\t"auto"    :  '+auto+'\n}';
  }
function elementClick(element,auto){
    console.log(getLocator(element));
    return '\n{\n\t"type" : "elementClick",\n\t"optional" : false,\n\t"param" : \n\t\t\t{\n\t\t\t\t"locator" :{ '+getLocator(element)+'}},\n\t"auto" : '+auto+'\n}';
}
  
 




  
function generateInstructions(){
    var instructions=[];

    // from iFrames
    
    
      for(var j=0;j<document.getElementsByTagName("iframe").length;j++){

        var localDoc;
        try {
            localDoc = document.getElementsByTagName("iframe")[j].contentWindow.document;
            console.err("iFrame detected, It may work wrongly  : ",localDoc);
            var inputs = localDoc.querySelectorAll('input,button,select,textarea');
            
            for(var i=0;i<inputs.length;i++){
            
              switch(inputs[i].getAttribute("type")){
                  
                  case 'hidden'     : break; 
                  
                  case 'tel':       
                  case 'password':       
                  case 'number':       
                  case 'email': 
                  case 'search': 
                  case 'url': 
                  case 'textarea':  
                  case 'text' :     instructions.push(textInput(inputs[i],'Ebin',true));
                                      break;
                                      
                  case 'radio':
                  case 'submit':
                  case 'file':
                  case 'checkbox':    instructions.push(elementClick(inputs[i],true));
                                      break;
              }
            }
        }
        catch(err) {
            console.log(err.message);
        }


      
     
      }
    
    
    //   from normal dom
    
      var inputs = document.querySelectorAll('input,button,select,textarea');
    //   inputs.push.apply(inputs, document.getElementsByTagName('button'))
        
    console.log("total inputs are : ",inputs);
      for(var i=0;i<inputs.length;i++){
      
      debugger;
      if(!inputs[i].getAttribute("type"))
      {
          switch(inputs[i].tagName.toLocaleLowerCase()){
              case 'textarea': instructions.push(textInput(inputs[i],'Ebin',true));
              break;
              case 'button':
              case 'a': instructions.push(elementClick(inputs[i],true));
              break;
          }
      }
      else
        switch(inputs[i].getAttribute("type")){
            
            case 'hidden'     : break; 
            
            case 'tel':       
            case 'password':       
            case 'number':       
            case 'email':   
            case 'text' :     instructions.push(textInput(inputs[i],'Ebin',true));
                                break;
                                
            case 'radio':
            case 'submit':
            case 'file':
            case 'checkbox':    instructions.push(elementClick(inputs[i],true));
                                break;
        }
      }
      return instructions;
}
  
function drawBorder(setFlag,locator){
    if(locator.id){
        var el=document.getElementById(locator.id)
        if(setFlag)
        {
        el.style.cssText ="outline : 2px solid red !important"; 
        }
        else
        el.style["outline"]= "";
    }else{
        el=getElementByXpath( locator.xpath);
        if(setFlag)
        {
        el.style.cssText ="outline : 2px solid red !important"; 
        }
        else
        el.style["outline"]= "";
    }
    el.scrollIntoView(false);
}

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        switch(message.type) {
            case "getText":
                sendResponse(generateInstructions());
                break;
            case "changeDom":
                drawBorder(message.set,message.locator);
                break;
        }
    }
);

