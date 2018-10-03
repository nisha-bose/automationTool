
// chrome.storage.sync.get('color', function(data) {
//   changeColor.style.backgroundColor = data.color;
//   changeColor.setAttribute('value', data.color);
//   codeBox.setAttribute('value', "data.color");

//   document.getElementById("codeBox").value=""
// });

var port = chrome.runtime.connect()


var app = angular.module("myApp", ['jsonFormatter']);

app.controller("myCtrl", function ($scope, $http) {

  $scope.response = [{ "type": "textInput", "locator": { "id": "firstname", "name": "firstname", "xpath": "//*[@id='firstname']" }, "auto": true, "enabled": false, "value": "orderdata.name", "selectedLocator": "id" }];
  $scope.checks = [];
  $scope.localState = {};
  $scope.currentInstructionCount = 0;
  $scope.locator = 'id';
  $scope.generator = {};
  $scope.inputs = {};
  $scope.condition = {};
  $scope.conditionArray = []; //Keep track opening and closing of condition. 
  $scope.generatePageFlag = true;
  $scope.changeLocator = function (currentInstruction, locator) {
    $scope.response[$scope.currentInstructionCount] = angular.copy($scope.currentInstruction);
    console.log(locator);
  }

  $scope.fetchApi = function (resume) {    
    // console.log($scope.inputs);
    $scope.localState = JSON.parse(localStorage.getItem('automationToolState'));
    $scope.loading = true;
    $http.get("https://atomic.incfile.com/api/webauto/misc-order/" + $scope.generator.state + "/llc?id=" + $scope.generator.order)
      .then(function (response) {
        $scope.loading = false;
        $scope.api = response.data;
        $scope.apiKeys = getNestedJsonKeys(response.data);

        $scope.generatePageFlag = false;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "getText", elements: $scope.inputs }, function (resp) {

            if (!resume)
              $scope.response = resp;
            else if ($scope.localState[$scope.generator.state]) {
              $scope.response = $scope.localState[$scope.generator.state].annualReport.instructions;
              $scope.currentInstructionCount = $scope.localState[$scope.generator.state].annualReport.currentInstructionCount;
            }
            else {
              alert('No resume data found for ' + $scope.generator.state + '. loading from the beginning...');
              $scope.response = resp;
              // $scope.currentInstructionCount = 0;
            }
            console.log("response from Page: ", resp);
            if (!resp || !resp.length) {
              alert("No fields found");
              console.error("No fields found");
            }
            else {
              $scope.currentInstruction = $scope.response[$scope.currentInstructionCount];
              makeDefaultLocator($scope.currentInstruction);
              if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
              makeBorder(true, getLocator($scope.currentInstruction));
              $scope.$apply();
            }

          });
        });
      });
  }
  $scope.closed = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "closed", elements: { test: "test" } }, function (resp) {
      })
    })
  }
  window.onblur = function () {
    $scope.closed();
  }


  function getNestedJsonKeys(apiObj) {
    var ops = [];
    function iterate(obj, parents = "") {
      if (typeof obj != "object") {
        ops.push({ key: parents, val: obj });
        return;
      }
      for (var key in obj) {
        iterate(obj[key], parents != "" ? (parents + (!isNaN(key) ? "[" : ".") + key + (!isNaN(key) ? "]" : "")) : key);
      }
    }
    iterate(apiObj);
    return ops;
  }
  $scope.setApiValue = function () {
    $scope.currentInstruction.value = 'orderdata.' + $scope.api.apiValue.split(" ").join("");
    // $scope.api.apiString = '';
  }

  function getLocator(obj) {
    return obj.locator;
  }
  function makeBorder(condition, locator) {  // set / reset
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "makeBox", set: condition, locator }, function (resp) {
        // resp got from content.js 
      });
    });
  }
  function setValueToDom(value, locator) {  // set / reset
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "setValue", value, locator, dropdownAsText: $scope.currentInstruction.dropdownMethod == 'text' }, function (resp) {
        // resp got from content.js 
      });
    });
  }


  $scope.goBack = function () {
    $scope.generatePageFlag = true;
  }
  function makeDefaultLocator(currentInstruction) {
    if (!currentInstruction.selectedLocator) {
      if (!!currentInstruction.locator.id)
        currentInstruction.selectedLocator = "id";
      else if (!!currentInstruction.locator.name)
        currentInstruction.selectedLocator = "name";
      else if (!!currentInstruction.locator.xpath)
        currentInstruction.selectedLocator = "xpath";
    }
  }

  $scope.next = function () {

    makeBorder(false, getLocator($scope.currentInstruction));
    $scope.currentInstruction = $scope.response[++$scope.currentInstructionCount];
    makeDefaultLocator($scope.currentInstruction);
    if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
    // alert($scope.currentInstruction.type);
    makeBorder(true, getLocator($scope.currentInstruction));
    debugger;
    if (typeof ($scope.currentInstruction.value) !== 'object') {
      $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
      $scope.api.apiString = '';
    } else {
      $scope.api.apiString = $scope.currentInstruction.value.value;
      $scope.api.apiValue = '';
    }
    $scope.api.currentApiValue = null;
    // $scope.displayApiValue();
  };

  $scope.previous = function () {
    makeBorder(false, getLocator($scope.currentInstruction));
    $scope.currentInstruction = $scope.response[--$scope.currentInstructionCount];
    makeBorder(true, getLocator($scope.currentInstruction));
    if (typeof ($scope.currentInstruction.value) !== 'object') {
      $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
      $scope.api.apiString = '';
    } else {
      $scope.api.apiString = $scope.currentInstruction.value.value;
      $scope.api.apiValue = '';
    }
    $scope.api.currentApiValue = null;
    // $scope.displayApiValue();
  };

  $scope.$watch('currentInstruction', (newVal, oldVal) => {
    if ($scope.generator.state) {
      console.log('state saved:', oldVal);
      $scope.displayApiValue();
      let value = ($scope.api.currentApiValue ? $scope.api.currentApiValue : $scope.currentInstruction.value.value || '');
      debugger;
      setValueToDom(value, getLocator($scope.currentInstruction));
      // $scope.localState[$scope.generator.state]
      $scope.localState[$scope.generator.state] = {
        annualReport: {
          instructions: $scope.response,
          currentInstructionCount: $scope.currentInstructionCount
        }
      }

      localStorage.setItem('automationToolState', JSON.stringify(
        $scope.localState
      ))
    }
    $scope.getConditionStatus();
  }, true);

  /**
   *
   * Method to get instruction element
   *
   * @param object currentInstruction
   *
   * @return object
   */
  $scope.getInstrunctionElement = function(currentInstruction) {          

        var element = {};

        switch (currentInstruction.type) {
          
          case 'textInput':
            
            element = {
              "type": "textEntry",
              "optional": false,
              "param": {
                "locator": {},
                "value": {}
              },
              "auto": true
            };

            element.auto = currentInstruction.auto;
            element.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            element.param.value = currentInstruction.value;
            break;

          case 'elementClick':

            element = {
              "type": "elementClick",
              "optional": false,
              "param": {},
              "auto": false
            };

            element.auto = currentInstruction.auto;
            element.param[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            break;

          case 'dropDownClick':

            element = {
              "type": "dropDownClick",
              "optional": false,
              "param": {
                "locator": {},
              },
              "auto": true
            };

            element.auto = currentInstruction.auto;
            element.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            if (currentInstruction.dropdownMethod == 'value')
              element.param.value = currentInstruction.value;
            else
              element.param.text = currentInstruction.value;
            
            break;

        };

        return element;    

  };

  /**
   **
   * Method to get instruction of condition
   *
   * @param object attr
   *
   * @return object
   */
  $scope.getInstructionOfCondition = function(currentInstruction) {

      var element = $scope.getInstrunctionElement(currentInstruction);
      
      /*let condition = {
                          "type"  : "condition",
                          "auto"  : true,
                          "param" : { "switchValue" : currentInstruction.contitionVariable,
                                      "branches"    : [ 
                                      { "caseValue"    : { "value" : currentInstruction.caseValue },
                                      "instructions" : [
                                      { "type"      : "operatorInput",
                                        "optional"  : false,
                                        "namespace" : "opsInput",
                                        "param"     : [{ "name" : "ordernum",
                                                        "type" : "text" } ],
                                        "auto"      : true } ] },
                                      { "defaultCase"  : true,
                                          "instructions" : [
                                          { "type"     : "setVariable",
                                              "optional" : false,
                                              "param"    : {"variable" : "opsInput.ordernum",
                                                          "value"    : "_args.ordernum" },
                                              "auto"     : true } ]
                                      } ] 
                                    }                         
                      };*/

       let condition = {
                          "type"  : "condition",
                          "auto"  : true,
                          "param" : { "switchValue" : currentInstruction.contitionVariable,
                                      "branches"    : [ 
                                      { "caseValue"    : { "value" : currentInstruction.caseValue },
                                      "instructions" : [ element ] },
                                      { "defaultCase"  : true,
                                          "instructions" : [
                                          { "type"     : "setVariable",
                                              "optional" : false,
                                              "param"    : {"variable" : "opsInput.ordernum",
                                                          "value"    : "_args.ordernum" },
                                              "auto"     : true } ]
                                      } ] 
                                    }                         
                      };               

      return condition;
  };

  /**
   *
   * Method to generate instrunctions
   *
   * @param void
   *
   * @return object
   */
  $scope.generateInstructions = function () {
    
    $scope.generation = {};
    $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
      .map(currentInstruction => {

        if (currentInstruction.conditionStarts) {             
            return $scope.getInstructionOfCondition(currentInstruction);
        }

        switch (currentInstruction.type) {
          case 'textInput':
            let textEntry = {
              "type": "textEntry",
              "optional": false,
              "param": {
                "locator": {},
                "value": {}
              },
              "auto": true
            }

            textEntry.auto = currentInstruction.auto;
            textEntry.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            textEntry.param.value = currentInstruction.value;
            return textEntry;
          case 'elementClick':
            elementClick = {
              "type": "elementClick",
              "optional": false,
              "param": {},
              "auto": false
            }
            elementClick.auto = currentInstruction.auto;
            elementClick.param[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            return elementClick;
          case 'dropDownClick':

            dropDownClick = {
              "type": "dropDownClick",
              "optional": false,
              "param": {
                "locator": {},
              },
              "auto": true
            }
            dropDownClick.auto = currentInstruction.auto;
            dropDownClick.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            if (currentInstruction.dropdownMethod == 'value')
              dropDownClick.param.value = currentInstruction.value;
            else
              dropDownClick.param.text = currentInstruction.value;
            return dropDownClick;          

        }
      })

    console.log($scope.instructions)
    $scope.generation.instructionsGenerated = true;

  }

  /**
   *
   * Method to generate instrunctions
   *
   * @param void
   *
   * @return object
   */
  $scope.generateInstructions_bkp = function () {    

    $scope.generation = {};
    $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
      .map(currentInstruction => {
        switch (currentInstruction.type) {
          case 'textInput':
            let textEntry = {
              "type": "textEntry",
              "optional": false,
              "param": {
                "locator": {},
                "value": {}
              },
              "auto": true
            }

            textEntry.auto = currentInstruction.auto;
            textEntry.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            textEntry.param.value = currentInstruction.value;
            return textEntry;
          case 'elementClick':
            elementClick = {
              "type": "elementClick",
              "optional": false,
              "param": {},
              "auto": false
            }
            elementClick.auto = currentInstruction.auto;
            elementClick.param[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            return elementClick;
          case 'dropDownClick':

            dropDownClick = {
              "type": "dropDownClick",
              "optional": false,
              "param": {
                "locator": {},
              },
              "auto": true
            }
            dropDownClick.auto = currentInstruction.auto;
            dropDownClick.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            if (currentInstruction.dropdownMethod == 'value')
              dropDownClick.param.value = currentInstruction.value;
            else
              dropDownClick.param.text = currentInstruction.value;
            return dropDownClick;

          case "condition" :            

            return $scope.getInstructionOfCondition();

        }
      })

    console.log($scope.instructions)
    $scope.generation.instructionsGenerated = true;

  }  
  $scope.copyToClipBoard = function () {
    var input = document.createElement("textarea");
    input.setAttribute("style", "width: 0;height: 0;opacity: 0;position: absolute;");
    input.setAttribute("id", "jsonText");
    input.value = JSON.stringify($scope.instructions);;
    document.body.appendChild(input);
    var copyText = document.getElementById("jsonText");
    copyText.select();
    document.execCommand("copy");
    $scope.generation.copied = true;
  }

  $scope.displayApiValue = function () {
    var currentApiValue;
    if ($scope.apiKeys.some(e => {
      if (e.key == $scope.api.apiValue) {
        currentApiValue = e.val;
        return true;
      }
    }))
      $scope.api.currentApiValue = currentApiValue;
    else $scope.api.currentApiValue = false;
  }


  // Condition functions here...

  /**
   *
   * Method to get condition based response
   *
   * @param void
   *
   * @return object
   */
  $scope.getConditionBasedResponse = function(attr) {

    $scope.counter = 0;

    /*var instruction = {
      "conditionStarts"   : true,
      "conditionVariable" : "",
      "conditionArr"      : [{
        "caseValue" : "",
        //"instructions" : [],
        "type": "textInput", "locator": { "id": "firstname", "name": "firstname", "xpath": "//*[@id='firstname']" }, 
        "auto": true, "enabled": false, "value": "orderdata.name", "selectedLocator": "id"
      }]
    };*/

    var instruction = {
      "conditionStarts"   : true,
      "conditionVariable" : "",
      "conditionArr"      : [{
        "caseValue" : "",
        "instructions" : []        
      }]
    };

    instruction.conditionArr[$scope.counter].instructions.push($scope.response[$scope.currentInstructionCount]);

    return instruction;

    //$scope.currentInstruction = unitInstruction;

    //$scope.response = [{ "type": "textInput", "locator": { "id": "firstname", "name": "firstname", "xpath": "//*[@id='firstname']" }, "auto": true, "enabled": false, "value": "orderdata.name", "selectedLocator": "id" }];

  };

  /**
   * Method to start conditional operation
   *
   * @param void
   *
   * @return object
   *
   */
  $scope.conditionStarts = function () {

    var attr = {};
    $scope.currentInstruction = $scope.getConditionBasedResponse(attr);
    
    /*$scope.currentInstruction.conditionStarts = !$scope.currentInstruction.conditionStarts;       
    $scope.conditionArray[$scope.currentInstructionCount] = {
      conditionStarts: !$scope.currentInstruction.conditionStarts,      
      case: $scope.condition.caseString
    };*/    

  };

  /**
   * Method to set conditional variable
   *
   * @param void
   *
   * @return object
   *
   */
  $scope.setConditionalVariable = function() {
      $scope.currentInstruction.conditionVariable = 'orderdata.' + $scope.condition.apiValue;
  };

  /**
   * Method to set case string
   *
   * @param void
   *
   * @return object
   *
   */
  $scope.setCaseString = function() {
      $scope.currentInstruction.conditionArr[$scope.counter].caseValue = $scope.condition.caseString;
  };

  /**
   * Method to set conditional api value
   *
   * @param void
   *
   * @return object
   *
   */
  $scope.setConditionalApiValue = function () {

    $scope.currentInstruction.conditionArr[$scope.counter].instructions[$scope.currentInstructionCount].value = 'orderdata.' 
    + $scope.api.apiValue.split(" ").join("");    
  }

  /**
   * Method to set conditional string value
   *
   * @param void
   *
   * @return object
   *
   */
  $scope.setConditionalStringValue = function () {

    //currentInstruction.value = {'value':api.apiString};api.apiValue='';api.currentApiValue=false

    $scope.currentInstruction.conditionArr[$scope.counter].instructions[$scope.currentInstructionCount].value = {
      "value" : $scope.api.apiString
    };
    $scope.api.apiValue = "";
    $scope.api.currentApiValue = false;

  };

  /**
   *
   * Method to handle condition based next operations
   *
   * @param void
   *
   * @return object
   */
  $scope.conditionalNext = function () {

    $scope.counter++;
    makeBorder(false, getLocator($scope.currentInstruction));
    //$scope.currentInstruction.conditionArr[$scope.counter] = {""};

    //alert("Response : " + JSON.stringify($scope.response[++$scope.currentInstructionCount]));


    /*$scope.currentInstruction = $scope.response[++$scope.currentInstructionCount];
    makeDefaultLocator($scope.currentInstruction);
    if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";    
    makeBorder(true, getLocator($scope.currentInstruction));
    debugger;
    if (typeof ($scope.currentInstruction.value) !== 'object') {
      $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
      $scope.api.apiString = '';
    } else {
      $scope.api.apiString = $scope.currentInstruction.value.value;
      $scope.api.apiValue = '';
    }
    $scope.api.currentApiValue = null;*/
    
  };

  /**
   *
   * Method to handle conditon based previous operations
   *
   * @param void
   *
   * @return object
   */
  $scope.conditionalPrevious = function () {
    makeBorder(false, getLocator($scope.currentInstruction));
    $scope.currentInstruction = $scope.response[--$scope.currentInstructionCount];
    makeBorder(true, getLocator($scope.currentInstruction));
    if (typeof ($scope.currentInstruction.value) !== 'object') {
      $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
      $scope.api.apiString = '';
    } else {
      $scope.api.apiString = $scope.currentInstruction.value.value;
      $scope.api.apiValue = '';
    }
    $scope.api.currentApiValue = null;
    // $scope.displayApiValue();
  };
 

  /**
   * Method to get condition status
   *
   * @param void
   *
   * @return object
   *
   */
  $scope.getConditionStatus = function () {
    currentCondition = [];
    console.log(
      $scope.response.some((e, i) => {
        debugger;
        if (e.conditionStarts) currentCondition.push(i);
        if (e.conditionEnds) currentCondition.pop();
        return (currentInstruction == i && !!currentCondition.length)
      })
    );
  };

})







