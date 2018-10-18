var port = chrome.runtime.connect();

var app = angular.module("myApp", ['jsonFormatter']);

app.controller("myCtrl", function($scope, $http, $timeout) {

    $scope.response = [{
        "type": "textInput",
        "locator": {
            "id": "firstname",
            "name": "firstname",
            "xpath": "//*[@id='firstname']"
        },
        "auto": true,
        "enabled": false,
        "value": "orderdata.name",
        "selectedLocator": "id"
    }];
    $scope.checks = [];
    $scope.localState = {};
    $scope.currentInstructionCount = 0;
    $scope.selectedCustomInstruction = 0;        
    $scope.customInstructions = [
                                    {"type" : "Select custom instruction", "value" : 0},
                                    {"type" : "Status", "value" : 1},
                                    {"type" : "Script", "value" : 2},
                                    {"type" : "Wait", "value" : 3},
                                    {"type" : "Wait For Element", "value" : 4},
                                    {"type" : "Load URL", "value" : 5},
                                    {"type" : "Common", "value" : 6},
                                    {"type" : "Read Local File", "value" : 7},
                                    {"type" : "File Upload", "value" : 8},
                                    {"type" : "Change File Name", "value" : 9},
                                    {"type" : "GetElementAttribute", "value" : 10},
                                    {"type" : "Scroll To Element", "value" : 11},
                                    {"type" : "Scroll To Position", "value" : 12},
                                    {"type" : "Element To PDF", "value" : 13},
                                    {"type" : "Radio Button", "value" : 14}                                    
                                ];    
    $scope.locator = 'id';
    $scope.generator = {};
    $scope.inputs = {};
    $scope.condition = {};
    $scope.conditionFlag = false;
    $scope.loopFlag = false;
    $scope.conditionArray = []; //Keep track opening and closing of condition. 
    $scope.generatePageFlag = true;       
    $scope.changeLocator = function(currentInstruction, locator) {
        $scope.response[$scope.currentInstructionCount] = angular.copy($scope.currentInstruction);
        console.log(locator);
    }

    /**
     * Method to fetch api data
     *
     * @param object resume
     *
     * @return object
     *
     */
    $scope.fetchApi = function(resume) {

        $scope.condition.apiValue = "";
        $scope.condition.caseString = "";
        $scope.conditionFlag = false;
        $scope.loopFlag = false;

        $scope.localState = JSON.parse(localStorage.getItem('automationToolState'));
        $scope.loading = true;
        $http.get("https://atomic.incfile.com/api/webauto/misc-order/" + $scope.generator.state + "/llc?id=" + $scope.generator.order)
            .then(function(response) {
                $scope.loading = false;
                $scope.api = response.data;
                $scope.apiKeys = getNestedJsonKeys(response.data);
                $scope.generatePageFlag = false;
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: "getText",
                        elements: $scope.inputs
                    }, function(resp) {

                        if (!resume)
                            $scope.response = resp;
                        else if ($scope.localState[$scope.generator.state]) {
                            $scope.response = $scope.localState[$scope.generator.state].annualReport.instructions;
                            $scope.currentInstructionCount = $scope.localState[$scope.generator.state].annualReport.currentInstructionCount;
                        } else {
                            alert('No resume data found for ' + $scope.generator.state + '. loading from the beginning...');
                            $scope.response = resp;
                        }
                        console.log("response from Page: ", resp);
                        if (!resp || !resp.length) {
                            alert("No fields found");
                            console.error("No fields found");
                        } else {
                            $scope.currentInstruction = $scope.response[$scope.currentInstructionCount];
                            makeDefaultLocator($scope.currentInstruction);
                            if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
                            makeBorder(true, getLocator($scope.currentInstruction));
                            $scope.$apply();
                        }

                    });
                });
            });
    };

    /**
     * Method to handle close event
     *
     * @param void 
     *
     * @return object
     *
     */
    $scope.closed = () => {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "closed",
                elements: {
                    test: "test"
                }
            }, function(resp) {})
        })
    };

    /**
     * Method to handle window blur event
     *
     * @param void 
     *
     * @return object
     *
     */
    window.onblur = function() {
        $scope.closed();
    };

    /**
     * Method to handle nested json keu
     *
     * @param object apiObj
     *
     * @return object
     *
     */
    function getNestedJsonKeys(apiObj) {
        var ops = [];

        function iterate(obj, parents = "") {
            if (typeof obj != "object") {
                ops.push({
                    key: parents,
                    val: obj
                });
                return;
            }
            for (var key in obj) {
                iterate(obj[key], parents != "" ? (parents + (!isNaN(key) ? "[" : ".") + key + (!isNaN(key) ? "]" : "")) : key);
            }
        }
        iterate(apiObj);
        return ops;
    }

    /**
     * Method to set api value
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.setApiValue = function() {
        $scope.currentInstruction.value = 'orderdata.' + $scope.api.apiValue.split(" ").join("");
    }

    /**
     * Method to get locator
     *
     * @param object obj
     *
     * @return object
     *
     */
    function getLocator(obj) {
        return obj.locator;
    }

    /**
     * Method to make border
     *
     * @param object condition
     * @param object locator
     *
     * @return object
     *
     */
    function makeBorder(condition, locator) { // set / reset
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "makeBox",
                set: condition,
                locator
            }, function(resp) {
                // resp got from content.js 
            });
        });
    }

    /**
     * Method to set value to dom element
     *
     * @param string value
     * @param object locator
     *
     * @return object
     *
     */
    function setValueToDom(value, locator) { // set / reset
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "setValue",
                value,
                locator,
                dropdownAsText: $scope.currentInstruction.dropdownMethod == 'text'
            }, function(resp) {
                // resp got from content.js 
            });
        });
    }

    /**
     * Method to handle go back action
     *
     * @param void
     *           
     * @return object     
     */
    $scope.goBack = function() {
        $scope.generatePageFlag = true;
    };

    /**
     * Method to make default locator
     *
     * @param object currentInstruction     
     *
     * @return object
     *
     */
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

    /**
     * Method to handle actions in next step
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.next = function() {

        $timeout(function(callback) {
            if ($scope.conditionFlag) {
                $scope.currentInstruction.enabled = true;
            }
        });

        makeBorder(false, getLocator($scope.currentInstruction));
        $scope.currentInstruction = $scope.response[++$scope.currentInstructionCount];
        makeDefaultLocator($scope.currentInstruction);
        if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
        makeBorder(true, getLocator($scope.currentInstruction));
        debugger;
        if (typeof($scope.currentInstruction.value) !== 'object') {
            $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
            $scope.api.apiString = '';
        } else {
            $scope.api.apiString = $scope.currentInstruction.value.value;
            $scope.api.apiValue = '';
        }
        $scope.api.currentApiValue = null;

        if ($scope.conditionFlag) {
            $scope.currentInstruction.enabled = true;
        }

    };

    /**
     * Method to handle actions in previous step
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.previous = function() {
        makeBorder(false, getLocator($scope.currentInstruction));
        $scope.currentInstruction = $scope.response[--$scope.currentInstructionCount];
        makeBorder(true, getLocator($scope.currentInstruction));
        if (typeof($scope.currentInstruction.value) !== 'object') {
            $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
            $scope.api.apiString = '';
        } else {
            $scope.api.apiString = $scope.currentInstruction.value.value;
            $scope.api.apiValue = '';
        }
        $scope.api.currentApiValue = null;

    };

    /**
     * Method to watch current instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.$watch('currentInstruction', (newVal, oldVal) => {
        if ($scope.generator.state) {
            console.log('state saved:', oldVal);
            $scope.displayApiValue();
            let value = ($scope.api.currentApiValue ? $scope.api.currentApiValue : $scope.currentInstruction.value.value || '');
            debugger;
            setValueToDom(value, getLocator($scope.currentInstruction));
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
    $scope.getInstructionElement = function(attr) {

        var element = {};

        switch (attr.type) {

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

                element.auto = attr.auto;
                element.param.locator[attr.selectedLocator] = attr.locator[attr.selectedLocator];
                element.param.value = attr.value;
                break;

            case 'elementClick':

                element = {
                    "type": "elementClick",
                    "optional": false,
                    "param": {},
                    "auto": false
                };

                element.auto = attr.auto;
                element.param[attr.selectedLocator] = attr.locator[attr.selectedLocator];
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

                element.auto = attr.auto;
                element.param.locator[attr.selectedLocator] = attr.locator[attr.selectedLocator];
                if (attr.dropdownMethod == 'value')
                    element.param.value = attr.value;
                else
                    element.param.text = attr.value;

                break;

        };

        return element;

    };

    /**
     *
     * Method to get instruction of condition
     *
     * @param object attr
     *
     * @return object
     */
    $scope.getInstructionOfCondition = function() {

        var condition = {
                "type": "condition",
                "auto": true,
                "param": {
                    "switchValue": "",
                    "branches": []
                }
            },
            count = 0,
            current = 0,
            caseObj = {},
            element = {},
            caseValue = "";

        $scope.generation = {};
        $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
            .map(currentInstruction => {

                if (count == 0) {
                    condition.param.switchValue = currentInstruction.conditionVariable;
                }

                element = $scope.getInstructionElement(currentInstruction);
                if (currentInstruction.caseValue) {

                    caseValue = currentInstruction.caseValue.trim();
                    caseValue = caseValue.toLowerCase();

                    if (caseValue == "default") {

                        caseObj = {
                            "defaultCase": true,
                            "instructions": []
                        };

                    } else {
                        caseObj = {
                            "caseValue": {
                                "value": currentInstruction.caseValue
                            },
                            "instructions": []
                        };

                    }

                    if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {

                        let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                        if (currentInstruction.statusMsg) {
                            statusInst.param = currentInstruction.statusMsg; 
                        }                                                     
                        caseObj.instructions.push(statusInst);                            
                    }
                    caseObj.instructions.push(element);
                    condition.param.branches.push(caseObj);

                    count++;

                } else {

                    current = count - 1;
                    if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {

                        let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                        if (currentInstruction.statusMsg) {
                            statusInst.param = currentInstruction.statusMsg; 
                        }                                                     
                        condition.param.branches[current].instructions.push(statusInst);                            
                    }
                    condition.param.branches[current].instructions.push(element);
                }

            });
        $scope.instructions = condition;
        console.log($scope.instructions);
        $scope.generation.instructionsGenerated = true;

    };


    /**
     *
     * Method to get instruction of Loop
     *
     * @param object attr
     *
     * @return object
     */
    $scope.getInstructionOfLoop = function() {

        var loop = {
                "type": "foreach",
                "auto": true,
                "param": {
                    "instanceName" : "",
                    "collection"   : "",
                    "instructions" : []
                }
            },
            count = 0,            
            element = {};            

        $scope.generation = {};
        $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
            .map(currentInstruction => { 

                if (count == 0) {
                    loop.param.instanceName = currentInstruction.loopInstanceName;
                    loop.param.collection = currentInstruction.loopCollection;

                    console.log("LOOP INSTANCE " + currentInstruction.loopInstanceName);
                    console.log("LOOP COLLECTION " + currentInstruction.loopCollection);

                    console.log("LOOP INSTRUCTION : " + JSON.stringify(loop));
                }
                element = $scope.getInstructionElement(currentInstruction);
                loop.param.instructions.push(element);
                count++;

            });
        $scope.instructions = loop;
        console.log($scope.instructions);
        $scope.generation.instructionsGenerated = true;

    };

    /**
     *
     * Method to generate script instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateScriptInstruction = function() {        

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "script",
                "comment"   : $scope.currentInstruction.scriptComment,
                "param"     : $scope.currentInstruction.customScript,
                "auto"      :true 
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate status instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateStatusInstruction = function() {        

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "status", 
                "comment"   : $scope.currentInstruction.statusComment,            
                "param"     : $scope.currentInstruction.statusParam                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate wait instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateWaitInstruction = function() {               

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "wait", 
                "comment"   : $scope.currentInstruction.waitComment,               
                "param"     : { "timeout": $scope.currentInstruction.waitTime },
                "auto"      : true                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };  

    /**
     *
     * Method to generate wait for element instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateWaitForElementInstruction = function() {               

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "waitForElement", 
                "comment"   : $scope.currentInstruction.waitElementComment,
                "param"     : {"locator" : {}},                
                "auto"      : true                
            }; 

            switch ($scope.currentInstruction.waitElementLocator) {

                case "id" :
                  $scope.instructions.param.locator = {"id" : $scope.currentInstruction.waitElementIdentifier};
                  break;

                case "name" :
                  $scope.instructions.param.locator = {"name" : $scope.currentInstruction.waitElementIdentifier};
                  break;
                  
                case "xpath" :
                  $scope.instructions.param.locator = {"xpath" : $scope.currentInstruction.waitElementIdentifier};
                  break;    
            };

        }
        $scope.generation.instructionsGenerated = true;        

    };  

    /**
     *
     * Method to generate load URL instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateLoadURLInstruction = function() {         

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "loadURL", 
                "comment"   : $scope.currentInstruction.URLComment,               
                "optional"  : false,
                "param"     : $scope.currentInstruction.URL,
                "auto"      : true                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    }; 

    /**
     *
     * Method to generate common instruction set
     *
     * @param void
     *
     * @return object
     */
    $scope.generateCommonInstructionSet = function() {         

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {

            let timeout = $scope.currentInstruction.commonTimeout;

            $scope.instructions = {
                    "version" : "1.0.0" ,
                    "binaryURL" : "http://www.google.com" ,
                    "instructions" :[
                        { "type" : "status", "param" : "Please wait..." },
                        { "type"  : "condition",
                          "auto"  : true,
                          "param" : { "switchValue" : "_args.ordernum",
                          "branches"    : [ { "caseValue"    : { "value" : null },
                                              "instructions" : [{ "type"      : "operatorInput",
                                                                  "optional"  : false,
                                                                  "namespace" : "opsInput",
                                                                  "param"     : [{ "name" : "ordernum",
                                                                                  "type" : "text" } ],
                                                                  "auto"      : true } ] },
                                            { "defaultCase"  : true,
                                              "instructions" : [{ "type"     : "setVariable",
                                                                  "optional" : false,
                                                                  "param"    : {"variable" : "opsInput.ordernum",
                                                                                "value"    : "_args.ordernum" },
                                                                  "auto"     : true } ] } ] } },
                        { "type"      : "datasetCollector",
                          "namespace" : "orderdata",
                          "param"     : { "url"    : "_args.dataURL",
                                          "params" : { "qs" : { "id" : "opsInput.ordernum" } } },
                                          "auto"      : true },
                        { "type" : "status", "param" : "Please wait..." },
                        { "type"    : "script",
                          "comment" : "test for company type we are using",
                          "param"   : "_setDatasetValue('runtime.companyType', _resolveDatasetNamespace('orderdata.company_type').search('CORPORATION') != -1 ? 'CORP'  : _resolveDatasetNamespace('orderdata.company_type') ); resolve();",
                          "auto"    : true },
                        { "type"      : "script",
                          "comment"   :"Select the registered agent",
                          "param"     : "driver.manage().timeouts().pageLoadTimeout(" + timeout + "); resolve();",
                          "auto"      :true 
                        }
                    ]
            };

        }

        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate read local file instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateReadLocalFileInstruction = function() {                 

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "readLocalFile", 
                "comment"   : $scope.currentInstruction.localFileComment,                               
                "param"     : { "filename" : $scope.currentInstruction.localFileName,
                "variable"  : {"value" : $scope.currentInstruction.localFileValue}},
                "auto"      : true                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate file upload instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateFileUploadInstruction = function() {                        

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "fileUpload", 
                "comment"   : $scope.currentInstruction.fileUploadComment,                               
                "param"     : { 
                                "url" : $scope.currentInstruction.fileUploadURL,
                                "variable" : $scope.currentInstruction.fileUploadVariable
                              },
                "auto"      : true                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate change file name instruction
     *
     * @param void
     *
     * @return object
     */
    $scope.generateChangeFileNameInstruction = function() {                                

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "changeFileName", 
                "comment"   : $scope.currentInstruction.changeFileNameComment,                               
                "param"     : {                                 
                                "filename" : $scope.currentInstruction.changeFileNameOfFileName
                              },
                "auto"      : true                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate instruction - GetElementAttribute
     *
     * @param void
     *
     * @return object
     */
    $scope.generateGetElementAttributeInstruction = function() {                       

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "getElementAttribute", 
                "comment"   : $scope.currentInstruction.getElementAttributeComment,
                "param"     : {
                                "locator"   : {},
                                "attribute" : "value",
                                "variable"  : $scope.currentInstruction.getElementAttributeVariable
                              },
                "auto"      : true                
            }; 

            switch ($scope.currentInstruction.getElementAttributeLocator) {

                case "id" :
                  $scope.instructions.param.locator = {"id" : $scope.currentInstruction.getElementAttributeIdentifier};
                  break;

                case "name" :
                  $scope.instructions.param.locator = {"name" : $scope.currentInstruction.getElementAttributeIdentifier};
                  break;
                  
                case "xpath" :
                  $scope.instructions.param.locator = {"xpath" : $scope.currentInstruction.getElementAttributeIdentifier};
                  break;    
            };

        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate instruction - scroll to element
     *
     * @param void
     *
     * @return object
     */
    $scope.generateScrollToElementInstruction = function() {  

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "scroll", 
                "optional"  : false,
                "param"     : {},
                "auto"      : true                
            }; 

            switch ($scope.currentInstruction.scrollToElementLocator) {

                case "id" :
                  $scope.instructions.param = {"id" : $scope.currentInstruction.scrollToElementIdentifier};
                  break;

                case "name" :
                  $scope.instructions.param = {"name" : $scope.currentInstruction.scrollToElementIdentifier};
                  break;
                  
                case "xpath" :
                  $scope.instructions.param = {"xpath" : $scope.currentInstruction.scrollToElementIdentifier};
                  break;    
            };

        }
        $scope.generation.instructionsGenerated = true;        

    };

    /**
     *
     * Method to generate instruction - scroll to position
     *
     * @param void
     *
     * @return object
     */
    $scope.generateScrollToPositionInstruction = function() { 

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "scroll", 
                "optional"  : false,
                "param"     : { 
                                "top" : $scope.currentInstruction.scrollToPositionTop,
                                "bottom" : $scope.currentInstruction.scrollToPositionBottom
                              },
                "auto"      : true                
            };                    
        }
        $scope.generation.instructionsGenerated = true;        

    };


    /**
     *
     * Method to generate instruction - elementToPDF
     *
     * @param void
     *
     * @return object
     */
    $scope.generateElementToPDFInstruction = function() {

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"      : "elementToPDF", 
                "comment"   : $scope.currentInstruction.elementToPDFComment,
                "param"     : {
                                "locator"   : {},
                                "variable" : { "value" : $scope.currentInstruction.elementToPDFValue },
                                "encoding" : "base64"
                              },
                "auto"      : true                
            }; 

            switch ($scope.currentInstruction.elementToPDFLocator) {

                case "id" :
                  $scope.instructions.param.locator = {"id" : $scope.currentInstruction.elementToPDFIdentifier};
                  break;

                case "name" :
                  $scope.instructions.param.locator = {"name" : $scope.currentInstruction.elementToPDFIdentifier};
                  break;
                  
                case "xpath" :
                  $scope.instructions.param.locator = {"xpath" : $scope.currentInstruction.elementToPDFIdentifier};
                  break;    
            };

        }
        $scope.generation.instructionsGenerated = true;        

    };    

    /**
     *
     * Method to generate instruction - radioButton
     *
     * @param void
     *
     * @return object
     */
    $scope.generateRadioButtonInstruction = function() {                

        $scope.generation = {};
        $scope.instructions = [];
        if ($scope.currentInstruction.enabled) {                        
            $scope.instructions = { 
                "type"     : "radioBtnClick", 
                "optional" : true,
                "param"    : {},
                "idx"      : $scope.currentInstruction.radioButtonIdx,
                "auto"     : true                
            }; 

            switch ($scope.currentInstruction.radioButtonLocator) {

                case "id" :
                  $scope.instructions.param = {"id" : $scope.currentInstruction.radioButtonIdentifier};
                  break;

                case "name" :
                  $scope.instructions.param = {"name" : $scope.currentInstruction.radioButtonIdentifier};
                  break;
                  
                case "xpath" :
                  $scope.instructions.param = {"xpath" : $scope.currentInstruction.radioButtonIdentifier};
                  break;    
            };

        }
        $scope.generation.instructionsGenerated = true;        

    };    


    /**
     *
     * Method to generate instructions
     *
     * @param void
     *
     * @return object
     */
    $scope.generateInstructions = function() {

        var inst = [];
        if ($scope.conditionFlag) {
            $scope.getInstructionOfCondition();
            return;
        }

        if ($scope.loopFlag) {
            $scope.getInstructionOfLoop();
            return;
        }

        if ($scope.currentInstruction.status) {
            $scope.generateStatusInstruction();
            return;
        }

        if ($scope.currentInstruction.script) {
            $scope.generateScriptInstruction();
            return;
        }

        if ($scope.currentInstruction.wait) {
            $scope.generateWaitInstruction();
            return;
        }

        if ($scope.currentInstruction.waitElement) {
            $scope.generateWaitForElementInstruction();
            return;
        }

        if ($scope.currentInstruction.loadURL) {
            $scope.generateLoadURLInstruction();
            return;
        }

        if ($scope.currentInstruction.common) {
            $scope.generateCommonInstructionSet();
            return;
        }

        if ($scope.currentInstruction.localFile) {
            $scope.generateReadLocalFileInstruction();
            return;
        }

        if ($scope.currentInstruction.fileUpload) {
            $scope.generateFileUploadInstruction();
            return;
        }

        if ($scope.currentInstruction.changeFileName) {
            $scope.generateChangeFileNameInstruction();
            return;
        }

        if ($scope.currentInstruction.getElementAttribute) {
            $scope.generateGetElementAttributeInstruction();
            return;
        }                

        if ($scope.currentInstruction.scrollToElement) {
            $scope.generateScrollToElementInstruction();
            return;
        }

        if ($scope.currentInstruction.scrollToPosition) {
            $scope.generateScrollToPositionInstruction();
            return;
        }

        if ($scope.currentInstruction.elementToPDF) {
            $scope.generateElementToPDFInstruction();
            return;
        }

        if ($scope.currentInstruction.radioButton) {
            $scope.generateRadioButtonInstruction();
            return;
        }    

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
 
                        if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {

                            let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                            if (currentInstruction.statusMsg) {
                                statusInst.param = currentInstruction.statusMsg; 
                            }                             
                            inst.push(statusInst);                            
                        } 
                        inst.push(textEntry);                        
                        break;
                        
                    case 'elementClick':

                        let elementClick = {
                            "type": "elementClick",
                            "optional": false,
                            "param": {},
                            "auto": false
                        }
                        elementClick.auto = currentInstruction.auto;
                        elementClick.param[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
                        
                        if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {
                            
                            let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                            if (currentInstruction.statusMsg) {
                                statusInst.param = currentInstruction.statusMsg; 
                            }                             
                            inst.push(statusInst);                            
                        }
                        inst.push(elementClick); 
                        break;

                    case 'dropDownClick':

                        let dropDownClick = {
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

                        if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {
                            
                            let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                            if (currentInstruction.statusMsg) {
                                statusInst.param = currentInstruction.statusMsg; 
                            }                             
                            inst.push(statusInst);                            
                        }
                        inst.push(dropDownClick); 
                        break;                        

                }

            });


        $scope.instructions = inst;
        console.log($scope.instructions);
        $scope.generation.instructionsGenerated = true;

    }    

    /**
     *
     * Method to copy to clip board
     *
     * @param void
     *
     * @return object
     */
    $scope.copyToClipBoard = function() {
        var input = document.createElement("textarea");
        input.setAttribute("style", "width: 0;height: 0;opacity: 0;position: absolute;");
        input.setAttribute("id", "jsonText");
        input.value = JSON.stringify($scope.instructions);;
        document.body.appendChild(input);
        var copyText = document.getElementById("jsonText");
        copyText.select();
        document.execCommand("copy");
        $scope.generation.copied = true;
    };

    /**
     *
     * Method to display api value
     *
     * @param void
     *
     * @return object
     */
    $scope.displayApiValue = function() {
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
       

    /**
     * Method to start conditional operation
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.conditionStarts = function() {

        $scope.loopFlag = false;        
        $scope.currentInstruction.loop = false;
        $scope.conditionFlag = false;
        $scope.currentInstruction.enabled = false;
        $scope.currentInstruction.conditionStarts = !$scope.currentInstruction.conditionStarts;
        if ($scope.currentInstruction.conditionStarts) {
            $scope.conditionFlag = true;
            $scope.currentInstruction.enabled = true;
        }

        /*$scope.conditionArray[$scope.currentInstructionCount] = {
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
        $scope.currentInstruction.caseValue = $scope.condition.caseString;
    };    


    /**
     * Method to get condition status
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.getConditionStatus = function() {
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

    /**
     * Method to add status instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addStatusInstruction = function() {                        
        $scope.currentInstruction.statusInstruction = $scope.currentInstruction.statusInstruction;
    };

    /**
     * Method to update status instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateStatusInstruction = function() {                        
        $scope.currentInstruction.statusMsg = $scope.currentInstruction.statusMsg;
    };

    /**
     * Method to add status
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addStatus = function() {                        
        $scope.currentInstruction = {
            'status'        : $scope.currentInstruction.status,
            'statusComment' : "",
            'statusParam'   : ""
        };
        $scope.initiateResetCustom();
    };

    /**
     * Method to update status comment
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateStatusComment = function() {                        
        $scope.currentInstruction.statusComment = $scope.currentInstruction.statusComment;
    };

    /**
     * Method to update status param
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateStatusParam = function() {                        
        $scope.currentInstruction.statusParam = $scope.currentInstruction.statusParam;
    };

    /**
     * Method to add custom script
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addScript = function() {                        
        $scope.currentInstruction = {
            'script'        : $scope.currentInstruction.script,
            'scriptComment' : "",
            'customScript'  : ""
        };
        $scope.initiateResetCustom();
    };    

    /**
     * Method to update script comment
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateScriptComment = function() {                        
        $scope.currentInstruction.scriptComment = $scope.currentInstruction.scriptComment;
    };

    /**
     * Method to update custom script
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateCustomScript = function() {                        
        $scope.currentInstruction.customScript = $scope.currentInstruction.customScript;
    };

    /**
     * Method to add wait
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addWait = function() {                        
        $scope.currentInstruction = {
            'wait'        : $scope.currentInstruction.wait,
            'waitComment' : "",
            'waitTime'    : ""
        };        
        $scope.initiateResetCustom();
    };

    /**
     * Method to update wait comment
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateWaitComment = function() {                        
        $scope.currentInstruction.waitComment = $scope.currentInstruction.waitComment;
    };

    /**
     * Method to update wait time
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateWaitTime = function() {                        
        $scope.currentInstruction.waitTime = $scope.currentInstruction.waitTime;
    }; 

    /**
     * Method to add wait for element
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addWaitForElement = function() {                        
        $scope.currentInstruction = {
            'waitElement'           : $scope.currentInstruction.waitElement,
            'waitElementComment'    : "",
            'waitElementLocator'    : "",
            'waitElementIdentifier' : ""
        };        
        $scope.initiateResetCustom();
    };

    /**
     * Method to update wait element comment
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateWaitElementComment = function() {                        
        $scope.currentInstruction.waitElementComment = $scope.currentInstruction.waitElementComment;
    };

    /**
     * Method to update wait element locator
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateWaitElementLocator = function() {                        
        $scope.currentInstruction.waitElementLocator = $scope.currentInstruction.waitElementLocator;
    };

    /**
     * Method to update wait element identifier
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateWaitElementIdentifier = function() {                        
        $scope.currentInstruction.waitElementIdentifier = $scope.currentInstruction.waitElementIdentifier;
    };

    /**
     * Method to add load URL
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addLoadURL = function() {                        
        $scope.currentInstruction = {
            'loadURL'    : $scope.currentInstruction.loadURL,
            'URLComment' : "",
            'URL'        : ""
        };
        $scope.initiateResetCustom();
    };

    /**
     * Method to update load url comment
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLoadURLComment = function() {                        
        $scope.currentInstruction.URLComment = $scope.currentInstruction.URLComment;
    };

    /**
     * Method to update load URL
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLoadURL = function() {                        
        $scope.currentInstruction.URL = $scope.currentInstruction.URL;
    };

    /**
     * Method to add common instruction set
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addCommon = function() {                        
        $scope.currentInstruction = {
            'common'    : $scope.currentInstruction.common,
            'commonTimeout'   : ""            
        };
        $scope.initiateResetCustom();
    };

    /**
     * Method to update common timeout
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateCommonTimeout = function() {                        
        $scope.currentInstruction.commonTimeout = $scope.currentInstruction.commonTimeout;
    };

    /**
     * Method to read local file
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.readLocalFile = function() {                        
        $scope.currentInstruction = {
            'localFile'        : $scope.currentInstruction.localFile,
            'localFileComment' : "",
            'localFileName'    : "",
            'localFileValue'   : ""
        };
        $scope.initiateResetCustom();
    };

    /**
     * Method to update local file comment
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLocalFileComment = function() {                        
        $scope.currentInstruction.localFileComment = $scope.currentInstruction.localFileComment;
    };

    /**
     * Method to update local file name
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLocalFileName = function() {                        
        $scope.currentInstruction.localFileName = $scope.currentInstruction.localFileName;
    };

    /**
     * Method to update local file value
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLocalFileValue = function() {                        
        $scope.currentInstruction.localFileValue = $scope.currentInstruction.localFileValue;
    };

    /**
     * Method to handle file upload
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addFileUpload = function() {                        
        $scope.currentInstruction = {
            'fileUpload'         : $scope.currentInstruction.fileUpload,
            'fileUploadComment'  : "",
            'fileUploadURL'      : "",
            'fileUploadVariable' : ""
        };
        $scope.initiateResetCustom();
    };

    /**
     * Method to update comment of file upload
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateFileUploadComment = function() {                        
        $scope.currentInstruction.fileUploadComment = $scope.currentInstruction.fileUploadComment;
    };

    /**
     * Method to update URL of file upload
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateFileUploadURL = function() {                        
        $scope.currentInstruction.fileUploadURL = $scope.currentInstruction.fileUploadURL;
    };

    /**
     * Method to update variable of file upload
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateFileUploadVariable = function() {                        
        $scope.currentInstruction.fileUploadVariable = $scope.currentInstruction.fileUploadVariable;
    };

    /**
     * Method to handle the instruction change file name
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addChangeFileName = function() {                        
        $scope.currentInstruction = {
            'changeFileName'         : $scope.currentInstruction.changeFileName,
            'changeFileNameComment'  : "",            
            'changeFileNameOfFileName' : ""
        };
        $scope.initiateResetCustom();
    };

    /**
     * Method to update comment of change file name instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateChangeFileNameComment = function() {                        
        $scope.currentInstruction.changeFileNameComment = $scope.currentInstruction.changeFileNameComment;
    };

    /**
     * Method to update file name of change file name instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateChangeFileNameOfFileName = function() {                        
        $scope.currentInstruction.changeFileNameOfFileName = $scope.currentInstruction.changeFileNameOfFileName;
    };

    /**
     * Method to add instruction - getElementAttribute
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addGetElementAttribute = function() {                        
        $scope.currentInstruction = {
            'getElementAttribute'           : $scope.currentInstruction.getElementAttribute,
            'getElementAttributeComment'    : "",
            'getElementAttributeLocator'    : "",
            'getElementAttributeIdentifier' : "",
            'getElementAttributeVariable'   : ""
        }; 
        $scope.initiateResetCustom();
    };

    /**
     * Method to update comment of instruction - getElementAttribute
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateGetElementAttributeComment = function() {                        
        $scope.currentInstruction.getElementAttributeComment = $scope.currentInstruction.getElementAttributeComment;
    };

    /**
     * Method to update locator of instruction - getElementAttribute
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateGetElementAttributeLocator = function() {                        
        $scope.currentInstruction.getElementAttributeLocator = $scope.currentInstruction.getElementAttributeLocator;
    };

    /**
     * Method to update identifier of instruction - getElementAttribute
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateElementAttributeIdentifier = function() {                        
        $scope.currentInstruction.getElementAttributeIdentifier = $scope.currentInstruction.getElementAttributeIdentifier;
    };

    /**
     * Method to update variable of instruction - getElementAttribute
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateGetElementAttributeVariable = function() {                        
        $scope.currentInstruction.getElementAttributeVariable = $scope.currentInstruction.getElementAttributeVariable;
    };

    /**
     * Method to add instruction - scroll to element
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addScrollToElement = function() {                        
        $scope.currentInstruction = {
            'scrollToElement'           : $scope.currentInstruction.scrollToElement,
            'scrollToElementLocator'    : "",
            'scrollToElementIdentifier' : ""
        }; 
        $scope.initiateResetCustom();
    };

    /**
     * Method to update locator of instruction - scroll to element
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateScrollToElementLocator = function() {                        
        $scope.currentInstruction.scrollToElementLocator = $scope.currentInstruction.scrollToElementLocator;
    };

    /**
     * Method to update identifier of instruction - scroll to element
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateScrollToElementIdentifier = function() {                        
        $scope.currentInstruction.scrollToElementIdentifier = $scope.currentInstruction.scrollToElementIdentifier;
    };

    /**
     * Method to add instruction - scroll to position
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addScrollToPosition = function() {                        
        $scope.currentInstruction = {
            'scrollToPosition'           : $scope.currentInstruction.scrollToPosition,
            'scrollToPositionTop'    : "",
            'scrollToPositionBottom' : ""
        }; 
        $scope.initiateResetCustom();
    };

    /**
     * Method to update top position of instruction - scroll to position
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateScrollToPositionTop = function() {                        
        $scope.currentInstruction.scrollToPositionTop = $scope.currentInstruction.scrollToPositionTop;
    };

    /**
     * Method to update bottom position of instruction - scroll to position
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateScrollToPositionBottom = function() {                        
        $scope.currentInstruction.scrollToPositionBottom = $scope.currentInstruction.scrollToPositionBottom;
    };

    /**
     * Method to add instruction - ElementToPDF
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addElementToPDF = function() {                        
        $scope.currentInstruction = {
            'elementToPDF'           : $scope.currentInstruction.elementToPDF,
            'elementToPDFComment'    : "",
            'elementToPDFLocator'    : "",
            'elementToPDFIdentifier' : "",
            'elementToPDFValue'      : ""
        }; 
        $scope.initiateResetCustom();
    };

    /**
     * Method to update comment of instruction - ElementToPDF
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateElementToPDFComment = function() {                        
        $scope.currentInstruction.elementToPDFComment = $scope.currentInstruction.elementToPDFComment;
    };

    /**
     * Method to update locator of instruction - ElementToPDF
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateElementToPDFLocator = function() {                        
        $scope.currentInstruction.elementToPDFLocator = $scope.currentInstruction.elementToPDFLocator;
    };

    /**
     * Method to update identifier of instruction - ElementToPDF
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateElementToPDFIdentifier = function() {                        
        $scope.currentInstruction.elementToPDFIdentifier = $scope.currentInstruction.elementToPDFIdentifier;
    };

    /**
     * Method to update value of instruction - ElementToPDF
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateElementToPDFValue = function() {                        
        $scope.currentInstruction.elementToPDFValue = $scope.currentInstruction.elementToPDFValue;
    };

    /**
     * Method to add instruction - RadioButton
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addRadioButton = function() {                        
        $scope.currentInstruction = {
            'radioButton'           : $scope.currentInstruction.radioButton,
            'radioButtonLocator'    : "",
            'radioButtonIdentifier' : "",
            'radioButtonIdx'        : ""
        }; 
        $scope.initiateResetCustom();
    };

    /**
     * Method to update locator of instruction - RadioButton
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateRadioButtonLocator = function() {                        
        $scope.currentInstruction.radioButtonLocator = $scope.currentInstruction.radioButtonLocator;
    };

    /**
     * Method to update identifier of instruction - RadioButton
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateRadioButtonIdentifier = function() {                        
        $scope.currentInstruction.radioButtonIdentifier = $scope.currentInstruction.radioButtonIdentifier;
    };

    /**
     * Method to update idx of instruction - RadioButton
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateRadioButtonIdx = function() {                        
        $scope.currentInstruction.radioButtonIdx = $scope.currentInstruction.radioButtonIdx;
    };

    /**
     * Method to initiate to reset custom instructions
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.initiateResetCustom = function() {

        $scope.loopFlag = false;        
        $scope.currentInstruction.loop = false;
        $scope.conditionFlag = false;        
        $scope.currentInstruction.conditionStarts = false;        

        if (!$scope.currentInstruction.status && !$scope.currentInstruction.script 
            && !$scope.currentInstruction.wait && !$scope.currentInstruction.waitElement 
            && !$scope.currentInstruction.loadURL && !$scope.currentInstruction.common 
            && !$scope.currentInstruction.localFile && !$scope.currentInstruction.fileUpload 
            && !$scope.currentInstruction.changeFileName && !$scope.currentInstruction.getElementAttribute  
            && !$scope.currentInstruction.scrollToElement && !$scope.currentInstruction.scrollToPosition 
            && !$scope.currentInstruction.elementToPDF && !$scope.currentInstruction.radioButton ) {

            $scope.resetStatusCustom();
        }

    };


    /**
     * Method to reset status and custom instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.resetStatusCustom = function() {                                
        $scope.currentInstruction = $scope.response[$scope.currentInstructionCount];        
        $scope.currentInstruction.status = false;
        $scope.currentInstruction.script = false;
        $scope.currentInstruction.wait = false;
        $scope.currentInstruction.waitElement = false;
        $scope.currentInstruction.loadURL = false;
        $scope.currentInstruction.common = false;
        $scope.currentInstruction.localFile = false;
        $scope.currentInstruction.fileUpload = false;
        $scope.currentInstruction.changeFileName = false;
        $scope.currentInstruction.getElementAttribute = false;
        $scope.currentInstruction.scrollToElement = false;
        $scope.currentInstruction.scrollToPosition = false;
        $scope.currentInstruction.elementToPDF = false; 
        $scope.currentInstruction.radioButton = false;        
    };

    /**
     * Method to start loop
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addLoop = function() {

        $scope.conditionFlag = false;
        $scope.currentInstruction.conditionStarts = false;
        $scope.loopFlag = false;        
        $scope.currentInstruction.loop = !$scope.currentInstruction.loop;
        if ($scope.currentInstruction.loop) {
            $scope.loopFlag = true;
            $scope.currentInstruction.enabled = true;
        }        

    };

    /**
     * Method to update loop instance name
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLoopInstanceName = function() {        
        $scope.currentInstruction.loopInstanceName = $scope.currentInstruction.loopInstanceName;
    };

    /**
     * Method to update loop collection
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateLoopCollection = function() {        
        $scope.currentInstruction.loopCollection = $scope.currentInstruction.loopCollection;
    };

    /**
     * Method to select instruction type
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.selectInstructionType = function(value) {                 

        $scope.selectedCustomInstruction = parseInt(value);
        switch ($scope.selectedCustomInstruction) {

            case 0:
                   $scope.resetStatusCustom();
                   break;

            case 1:
                   $scope.currentInstruction.status = true; 
                   $scope.addStatus();
                   break;

            case 2:
                   $scope.currentInstruction.script = true; 
                   $scope.addScript();
                   break;
                   
            case 3:
                   $scope.currentInstruction.wait = true; 
                   $scope.addWait();
                   break;
                   
            case 4:
                   $scope.currentInstruction.waitElement = true; 
                   $scope.addWaitForElement();
                   break;
                   
            case 5:
                   $scope.currentInstruction.loadURL = true; 
                   $scope.addLoadURL();
                   break;

            case 6:
                   $scope.currentInstruction.common = true; 
                   $scope.addCommon();
                   break;
                   
            case 7:
                   $scope.currentInstruction.localFile = true; 
                   $scope.readLocalFile();
                   break;
                   
            case 8:
                   $scope.currentInstruction.fileUpload = true; 
                   $scope.addFileUpload();
                   break;
                   
            case 9:
                   $scope.currentInstruction.changeFileName = true; 
                   $scope.addChangeFileName();
                   break;

            case 10:
                   $scope.currentInstruction.getElementAttribute = true; 
                   $scope.addGetElementAttribute();
                   break;
                   
            case 11:
                   $scope.currentInstruction.scrollToElement = true; 
                   $scope.addScrollToElement();
                   break;
                   
            case 12:
                   $scope.currentInstruction.scrollToPosition = true; 
                   $scope.addScrollToPosition();
                   break;                                   

            case 13:
                   $scope.currentInstruction.elementToPDF = true; 
                   $scope.addElementToPDF();
                   break;                                          

            case 14:
                   $scope.currentInstruction.radioButton = true; 
                   $scope.addRadioButton();
                   break;                                                 

        }

    };




});